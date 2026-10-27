import "server-only";
import { Prisma } from "@/generated/prisma/client";
import { db } from "../db";
import { badRequest, conflict, forbidden, notFound } from "../errors";
import { canCreateOffer, canRespond, nextStatus, type OfferAction, type RuleResult } from "../domain/offer-rules";
import { formatInr } from "../format";
import { expireStaleReservations, postSystemMessage, transitionListingTx } from "./lifecycle";

function enforce(result: RuleResult) {
  if (result.ok) return;
  if (result.error === "forbidden") throw forbidden(result.message);
  if (result.error === "invalid") throw badRequest(result.message, { amountInr: [result.message] });
  throw conflict(result.message);
}

function isUniqueViolation(err: unknown) {
  return err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002";
}

const PENDING_EXISTS = "There's already a pending offer in this conversation.";

export async function createOffer(userId: string, conversationId: string, amountInr: number) {
  const convo = await db.conversation.findUnique({
    where: { id: conversationId },
    select: { id: true, listingId: true, buyerId: true, sellerId: true },
  });
  if (!convo) throw notFound("Conversation not found.");
  await expireStaleReservations([convo.listingId]);

  const [listing, pending] = await Promise.all([
    db.listing.findUniqueOrThrow({ where: { id: convo.listingId }, select: { status: true } }),
    db.offer.count({ where: { conversationId, status: "PENDING" } }),
  ]);
  enforce(canCreateOffer({ actorId: userId, conversation: convo, listingStatus: listing.status, hasPendingOffer: pending > 0, amount: amountInr }));

  try {
    return await db.$transaction(async (tx) => {
      // Re-check availability inside the transaction to close the race with a reservation.
      const fresh = await tx.listing.findUniqueOrThrow({ where: { id: convo.listingId }, select: { status: true } });
      if (fresh.status !== "AVAILABLE") throw conflict("Offers can only be made on available items.");
      const offer = await tx.offer.create({
        data: { conversationId, listingId: convo.listingId, proposerId: userId, amountInr },
        select: { id: true },
      });
      await tx.message.create({ data: { conversationId, senderId: userId, type: "OFFER", offerId: offer.id, body: `Offered ${formatInr(amountInr)}` } });
      await tx.conversation.update({ where: { id: conversationId }, data: { lastMessageAt: new Date(), buyerLastReadAt: new Date() } });
      return offer;
    });
  } catch (err) {
    // The partial unique index ("one PENDING per conversation") catches double submits.
    if (isUniqueViolation(err)) throw conflict(PENDING_EXISTS);
    throw err;
  }
}

export async function respondToOffer(userId: string, offerId: string, action: OfferAction, counterAmount?: number) {
  const offer = await db.offer.findUnique({
    where: { id: offerId },
    select: {
      id: true,
      proposerId: true,
      status: true,
      amountInr: true,
      listingId: true,
      conversation: { select: { id: true, buyerId: true, sellerId: true } },
      proposer: { select: { name: true } },
    },
  });
  if (!offer) throw notFound("Offer not found.");
  const convo = offer.conversation;
  await expireStaleReservations([offer.listingId]);
  const listing = await db.listing.findUniqueOrThrow({ where: { id: offer.listingId }, select: { status: true } });

  enforce(canRespond({ actorId: userId, offer, conversation: convo, action, listingStatus: listing.status, counterAmount }));
  const actor = await db.user.findUniqueOrThrow({ where: { id: userId }, select: { name: true } });
  const first = actor.name.split(" ")[0];

  try {
    return await db.$transaction(async (tx) => {
      // Conditional update: only one response can win for a given pending offer.
      const res = await tx.offer.updateMany({
        where: { id: offerId, status: "PENDING" },
        data: { status: nextStatus(action), respondedAt: new Date() },
      });
      if (res.count === 0) throw conflict("This offer was already answered. Refresh to see the latest.");

      if (action === "accept") {
        // Accepting reserves the listing for the conversation's buyer at the agreed amount,
        // atomically with the offer update: if the item was just reserved by someone else, both roll back.
        await postSystemMessage(tx, convo.id, `${first} accepted the ${formatInr(offer.amountInr)} offer.`);
        await transitionListingTx(tx, {
          listingId: offer.listingId,
          action: "reserve",
          actorId: convo.sellerId,
          conversationId: convo.id,
          price: offer.amountInr,
          acceptedOfferId: offer.id,
          eventActorId: userId,
          reason: "offer_accepted",
        });
        return { status: "ACCEPTED" as const };
      }
      if (action === "counter") {
        const counter = await tx.offer.create({
          data: { conversationId: convo.id, listingId: offer.listingId, proposerId: userId, amountInr: counterAmount!, counterOfId: offer.id },
          select: { id: true },
        });
        await tx.message.create({
          data: { conversationId: convo.id, senderId: userId, type: "OFFER", offerId: counter.id, body: `Countered with ${formatInr(counterAmount!)}` },
        });
        await tx.conversation.update({ where: { id: convo.id }, data: { lastMessageAt: new Date() } });
        return { status: "COUNTERED" as const, counterOfferId: counter.id };
      }
      const verb = action === "reject" ? "declined" : "withdrew";
      await postSystemMessage(tx, convo.id, `${first} ${verb} the ${formatInr(offer.amountInr)} offer.`);
      return { status: nextStatus(action) };
    });
  } catch (err) {
    if (isUniqueViolation(err)) throw conflict(PENDING_EXISTS);
    throw err;
  }
}
