import "server-only";
import { Prisma } from "@/generated/prisma/client";
import { db } from "../db";
import { conflict, forbidden, notFound } from "../errors";
import { assertParticipant } from "../authz";
import { participantRole } from "../authz-rules";
import { expireStaleReservations } from "./lifecycle";

/** Opens the buyer's inquiry on a listing, or returns the existing one (unique per listing+buyer). */
export async function openConversation(buyerId: string, listingId: string) {
  const listing = await db.listing.findUnique({ where: { id: listingId }, select: { id: true, sellerId: true, status: true, publishedAt: true } });
  if (!listing || !listing.publishedAt) throw notFound("Listing not found.");
  if (listing.sellerId === buyerId) throw forbidden("This is your own listing.");

  const existing = await db.conversation.findUnique({ where: { listingId_buyerId: { listingId, buyerId } }, select: { id: true } });
  if (existing) return { id: existing.id, created: false };
  if (listing.status === "SOLD" || listing.status === "WITHDRAWN") throw conflict("This item is no longer available.");

  try {
    const convo = await db.conversation.create({ data: { listingId, buyerId, sellerId: listing.sellerId }, select: { id: true } });
    return { id: convo.id, created: true };
  } catch (err) {
    // Double-click / two tabs: the unique constraint makes the second create fail; return the winner.
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      const winner = await db.conversation.findUniqueOrThrow({ where: { listingId_buyerId: { listingId, buyerId } }, select: { id: true } });
      return { id: winner.id, created: false };
    }
    throw err;
  }
}

async function getParticipantConversation(userId: string, conversationId: string) {
  const convo = await db.conversation.findUnique({
    where: { id: conversationId },
    select: { id: true, listingId: true, buyerId: true, sellerId: true, buyerLastReadAt: true, sellerLastReadAt: true },
  });
  if (!convo) throw notFound("Conversation not found.");
  assertParticipant({ id: userId }, convo);
  return convo;
}

const messageSelect = {
  id: true,
  type: true,
  body: true,
  senderId: true,
  offerId: true,
  createdAt: true,
} as const;

/**
 * Full thread state for the polling client: new messages since `after`, plus the
 * current listing and offer state (small, and needed to render action buttons).
 */
export async function getThread(userId: string, conversationId: string, after?: Date) {
  const convo = await getParticipantConversation(userId, conversationId);
  await expireStaleReservations([convo.listingId]);

  const [messages, offers, listing, counterpart] = await Promise.all([
    db.message.findMany({
      where: { conversationId, ...(after ? { createdAt: { gt: after } } : {}) },
      orderBy: { createdAt: "asc" },
      take: after ? 100 : 300,
      select: messageSelect,
    }),
    db.offer.findMany({
      where: { conversationId },
      orderBy: { createdAt: "asc" },
      select: { id: true, proposerId: true, amountInr: true, status: true, createdAt: true, respondedAt: true },
    }),
    db.listing.findUniqueOrThrow({
      where: { id: convo.listingId },
      select: {
        id: true,
        title: true,
        priceInr: true,
        status: true,
        sellerId: true,
        reservedForId: true,
        reservedPrice: true,
        reservedUntil: true,
        images: { orderBy: { position: "asc" }, take: 1, select: { url: true } },
      },
    }),
    db.user.findUniqueOrThrow({
      where: { id: convo.buyerId === userId ? convo.sellerId : convo.buyerId },
      select: { id: true, name: true }, // never the email
    }),
  ]);

  return {
    conversation: { id: convo.id, buyerId: convo.buyerId, sellerId: convo.sellerId },
    role: participantRole(userId, convo)!,
    counterpart,
    listing: { ...listing, coverUrl: listing.images[0]?.url ?? null, images: undefined },
    offers,
    messages,
    serverTime: new Date().toISOString(),
  };
}
export type ThreadState = Awaited<ReturnType<typeof getThread>>;

export async function postMessage(userId: string, conversationId: string, body: string) {
  const convo = await getParticipantConversation(userId, conversationId);
  const [message] = await db.$transaction([
    db.message.create({ data: { conversationId: convo.id, senderId: userId, type: "TEXT", body }, select: messageSelect }),
    db.conversation.update({
      where: { id: convo.id },
      data: { lastMessageAt: new Date(), ...(convo.buyerId === userId ? { buyerLastReadAt: new Date() } : { sellerLastReadAt: new Date() }) },
    }),
  ]);
  return message;
}

export async function markRead(userId: string, conversationId: string) {
  const convo = await getParticipantConversation(userId, conversationId);
  await db.conversation.update({
    where: { id: convo.id },
    data: convo.buyerId === userId ? { buyerLastReadAt: new Date() } : { sellerLastReadAt: new Date() },
  });
}

type InboxRow = {
  id: string;
  listingId: string;
  listingTitle: string;
  listingStatus: string;
  coverUrl: string | null;
  role: "buyer" | "seller";
  counterpartName: string;
  lastMessageAt: Date;
  lastBody: string | null;
  lastType: string | null;
  unread: bigint;
};

/** Inbox with per-conversation unread counts in one indexed query. */
export async function listInbox(userId: string) {
  const rows = await db.$queryRaw<InboxRow[]>`
    SELECT c."id", c."listingId", l."title" AS "listingTitle", l."status"::text AS "listingStatus",
           (SELECT i."url" FROM "ListingImage" i WHERE i."listingId" = l."id" ORDER BY i."position" LIMIT 1) AS "coverUrl",
           CASE WHEN c."buyerId" = ${userId} THEN 'buyer' ELSE 'seller' END AS "role",
           u."name" AS "counterpartName",
           c."lastMessageAt",
           lm."body" AS "lastBody", lm."type"::text AS "lastType",
           (SELECT COUNT(*) FROM "Message" m
             WHERE m."conversationId" = c."id"
               AND (m."senderId" IS NULL OR m."senderId" <> ${userId})
               AND m."createdAt" > CASE WHEN c."buyerId" = ${userId} THEN c."buyerLastReadAt" ELSE c."sellerLastReadAt" END
           ) AS "unread"
    FROM "Conversation" c
    JOIN "Listing" l ON l."id" = c."listingId"
    JOIN "User" u ON u."id" = CASE WHEN c."buyerId" = ${userId} THEN c."sellerId" ELSE c."buyerId" END
    LEFT JOIN LATERAL (
      SELECT m."body", m."type" FROM "Message" m WHERE m."conversationId" = c."id" ORDER BY m."createdAt" DESC LIMIT 1
    ) lm ON true
    WHERE c."buyerId" = ${userId} OR c."sellerId" = ${userId}
    ORDER BY c."lastMessageAt" DESC
    LIMIT 100`;
  return rows.map((r) => ({ ...r, unread: Number(r.unread) }));
}

export async function unreadTotal(userId: string) {
  const [row] = await db.$queryRaw<{ n: bigint }[]>`
    SELECT COUNT(*) AS n FROM "Message" m
    JOIN "Conversation" c ON c."id" = m."conversationId"
    WHERE (c."buyerId" = ${userId} OR c."sellerId" = ${userId})
      AND (m."senderId" IS NULL OR m."senderId" <> ${userId})
      AND m."createdAt" > CASE WHEN c."buyerId" = ${userId} THEN c."buyerLastReadAt" ELSE c."sellerLastReadAt" END`;
  return Number(row?.n ?? 0);
}

export async function listListingConversations(sellerId: string, listingId: string) {
  return db.conversation.findMany({
    where: { listingId, sellerId },
    orderBy: { lastMessageAt: "desc" },
    select: { id: true, buyer: { select: { id: true, name: true } }, lastMessageAt: true },
  });
}
