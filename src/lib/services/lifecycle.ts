import "server-only";
import type { Prisma } from "@/generated/prisma/client";
import { db } from "../db";
import { AppError, conflict, forbidden, notFound, badRequest } from "../errors";
import { planTransition, reservationDeadline, type ListingAction, type ListingStatus } from "../domain/listing-state";
import { formatInr } from "../format";

type Tx = Prisma.TransactionClient;

const REASON: Record<ListingAction, string> = {
  reserve: "reserved",
  cancel_reservation: "reservation_cancelled",
  back_out: "buyer_backed_out",
  expire: "reservation_expired",
  complete: "sold",
  withdraw: "withdrawn",
  relist: "relisted",
};

export async function postSystemMessage(tx: Tx, conversationId: string, body: string) {
  await tx.message.create({ data: { conversationId, type: "SYSTEM", body } });
  await tx.conversation.update({ where: { id: conversationId }, data: { lastMessageAt: new Date() } });
}

/** Expires every PENDING offer on a listing (except `keepOfferId`) and tells each affected buyer why. */
async function expirePendingOffers(tx: Tx, listingId: string, why: string, keepOfferId?: string) {
  const pending = await tx.offer.findMany({
    where: { listingId, status: "PENDING", ...(keepOfferId ? { id: { not: keepOfferId } } : {}) },
    select: { id: true, conversationId: true, amountInr: true },
  });
  if (!pending.length) return;
  await tx.offer.updateMany({
    where: { id: { in: pending.map((o) => o.id) }, status: "PENDING" },
    data: { status: "EXPIRED", respondedAt: new Date() },
  });
  for (const o of pending) {
    await postSystemMessage(tx, o.conversationId, `The ${formatInr(o.amountInr)} offer expired: ${why}`);
  }
}

export type TransitionInput = {
  listingId: string;
  action: ListingAction;
  actorId: string | null; // null = system
  conversationId?: string; // required for "reserve": whose buyer gets the item
  price?: number; // reservation price (accepted offer); defaults to the listing price
  acceptedOfferId?: string;
  /** Who to record in the event log when it differs from the rule-checked actor (e.g. a buyer accepting a seller's counter). */
  eventActorId?: string;
  reason?: string;
};

/**
 * Executes one lifecycle transition inside the caller's transaction.
 * The status update is conditional (`WHERE status = <expected>`), so if two
 * requests race, exactly one succeeds and the other gets 409 Conflict.
 */
export async function transitionListingTx(tx: Tx, input: TransitionInput) {
  const { listingId, action, actorId } = input;
  const listing = await tx.listing.findUnique({
    where: { id: listingId },
    select: { id: true, title: true, sellerId: true, status: true, publishedAt: true, reservedForId: true, reservedPrice: true, priceInr: true },
  });
  if (!listing) throw notFound("Listing not found.");

  const plan = planTransition(listing, action, actorId);
  if (!plan.ok) {
    if (plan.error === "forbidden") throw forbidden(plan.message);
    throw conflict(plan.message);
  }

  let data: Prisma.ListingUpdateManyMutationInput & { reservedForId?: string | null } = { status: plan.to };
  let reservedBuyerConversationId: string | null = null;

  if (action === "reserve") {
    if (!input.conversationId) throw badRequest("Choose which buyer to reserve for.");
    const convo = await tx.conversation.findUnique({ where: { id: input.conversationId }, select: { listingId: true, buyerId: true } });
    if (!convo || convo.listingId !== listingId) throw notFound("Conversation not found for this listing.");
    data = { ...data, reservedForId: convo.buyerId, reservedPrice: input.price ?? listing.priceInr, reservedUntil: reservationDeadline() };
  }
  if (plan.from === "RESERVED") {
    const convo = listing.reservedForId
      ? await tx.conversation.findUnique({ where: { listingId_buyerId: { listingId, buyerId: listing.reservedForId } }, select: { id: true } })
      : null;
    reservedBuyerConversationId = convo?.id ?? null;
    if (plan.to !== "SOLD") data = { ...data, reservedForId: null, reservedPrice: null, reservedUntil: null };
  }

  const updated = await tx.listing.updateMany({
    where: {
      id: listingId,
      status: plan.from,
      // Guard against acting on a reservation that changed hands in between.
      ...(plan.from === "RESERVED" ? { reservedForId: listing.reservedForId } : {}),
      ...(action === "expire" ? { reservedUntil: { lt: new Date() } } : {}),
    },
    data,
  });
  if (updated.count === 0) {
    const now = await tx.listing.findUnique({ where: { id: listingId }, select: { status: true } });
    if (!now) throw notFound("Listing not found.");
    throw conflict(`Someone got there first: this item is now ${now.status.toLowerCase()}. Refresh to see the latest.`);
  }

  await tx.listingEvent.create({
    data: { listingId, actorId: input.eventActorId ?? actorId, fromStatus: plan.from, toStatus: plan.to, reason: input.reason ?? REASON[action] },
  });

  // ---- Side effects ----
  if (plan.to === "RESERVED") {
    await expirePendingOffers(tx, listingId, "the item was reserved.", input.acceptedOfferId);
    const until = (data.reservedUntil as Date).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Kolkata" });
    const buyer = await tx.user.findUniqueOrThrow({ where: { id: data.reservedForId as string }, select: { name: true } });
    // Both participants see system messages, so name the buyer rather than saying "you".
    await postSystemMessage(
      tx,
      input.conversationId!,
      `Reserved for ${buyer.name.split(" ")[0]} at ${formatInr(data.reservedPrice as number)} until ${until}. Meet on campus to complete the sale.`,
    );
  }
  if (plan.to === "WITHDRAWN") {
    await expirePendingOffers(tx, listingId, "the seller withdrew the listing.");
    if (reservedBuyerConversationId) await postSystemMessage(tx, reservedBuyerConversationId, "The seller withdrew this listing, so your reservation was cancelled.");
  }
  if (plan.from === "RESERVED" && plan.to === "AVAILABLE" && reservedBuyerConversationId) {
    const msg = {
      cancel_reservation: "The seller cancelled the reservation. The item is available again.",
      back_out: "The buyer backed out of the reservation. The item is available again.",
      expire: "The 48-hour reservation expired. The item is available again.",
    }[action as "cancel_reservation" | "back_out" | "expire"];
    await postSystemMessage(tx, reservedBuyerConversationId, msg);
  }
  if (plan.to === "SOLD") {
    if (!listing.reservedForId) throw new AppError(500, "INTERNAL", "Reserved listing has no buyer.");
    // Link the accepted offer only if this reservation actually came from it
    // (a later manual reservation may be at a different price).
    const accepted = reservedBuyerConversationId
      ? await tx.offer.findFirst({
          where: { conversationId: reservedBuyerConversationId, status: "ACCEPTED", amountInr: listing.reservedPrice ?? -1 },
          orderBy: { respondedAt: "desc" },
          select: { id: true },
        })
      : null;
    await tx.transaction.create({
      data: {
        listingId,
        buyerId: listing.reservedForId,
        sellerId: listing.sellerId,
        finalPrice: listing.reservedPrice ?? listing.priceInr,
        offerId: accepted?.id ?? null,
      },
    });
    await expirePendingOffers(tx, listingId, "the item was sold.");
    if (reservedBuyerConversationId) {
      await postSystemMessage(tx, reservedBuyerConversationId, `Sale completed at ${formatInr(listing.reservedPrice ?? listing.priceInr)}. Enjoy!`);
    }
  }
  return { from: plan.from as ListingStatus, to: plan.to as ListingStatus };
}

export function transitionListing(input: TransitionInput) {
  return db.$transaction((tx) => transitionListingTx(tx, input));
}

/**
 * Lazy reservation expiry: called whenever listings are read or acted on, so no
 * background worker is needed. Each expiry is its own conditional transition, so
 * concurrent callers can't double-expire.
 */
export async function expireStaleReservations(listingIds?: string[]) {
  const stale = await db.listing.findMany({
    where: { status: "RESERVED", reservedUntil: { lt: new Date() }, ...(listingIds ? { id: { in: listingIds } } : {}) },
    select: { id: true },
    take: 50,
  });
  for (const { id } of stale) {
    try {
      await transitionListing({ listingId: id, action: "expire", actorId: null });
    } catch (err) {
      // Another request expired it first (409): fine.
      if (!(err instanceof AppError && err.status === 409)) console.error("[lifecycle] expiry failed", id, err);
    }
  }
}
