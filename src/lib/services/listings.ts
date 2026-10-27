import "server-only";
import { db } from "../db";
import { conflict, notFound, badRequest } from "../errors";
import { assertListingOwner } from "../authz";
import { deleteBlobs } from "../blob";
import type { ListingInput } from "../validation/listing";

export const listingCardSelect = {
  id: true,
  title: true,
  priceInr: true,
  category: true,
  condition: true,
  status: true,
  publishedAt: true,
  pickupLocation: true,
  createdAt: true,
  images: { orderBy: { position: "asc" as const }, take: 1, select: { url: true } },
} as const;

export function canEditListing(listing: { status: string }) {
  return listing.status !== "SOLD";
}

async function getOwnedListing(userId: string, listingId: string) {
  const listing = await db.listing.findUnique({
    where: { id: listingId },
    select: { id: true, sellerId: true, status: true, publishedAt: true },
  });
  if (!listing) throw notFound("Listing not found.");
  assertListingOwner({ id: userId }, listing);
  return listing;
}

export async function createDraftListing(userId: string, input: ListingInput) {
  return db.listing.create({ data: { ...input, sellerId: userId }, select: { id: true } });
}

export async function updateListing(userId: string, listingId: string, input: ListingInput) {
  const listing = await getOwnedListing(userId, listingId);
  if (!canEditListing(listing)) throw conflict("Sold listings can't be edited.");
  // Conditional update so a concurrent "mark as sold" can't be overwritten.
  const res = await db.listing.updateMany({ where: { id: listingId, status: { not: "SOLD" } }, data: input });
  if (res.count === 0) throw conflict("Sold listings can't be edited.");
}

export async function publishListing(userId: string, listingId: string) {
  const listing = await getOwnedListing(userId, listingId);
  if (listing.publishedAt) return;
  const imageCount = await db.listingImage.count({ where: { listingId } });
  if (imageCount < 1) throw badRequest("Add at least one photo before publishing.");
  await db.$transaction([
    db.listing.update({ where: { id: listingId }, data: { publishedAt: new Date() } }),
    db.listingEvent.create({
      data: { listingId, actorId: userId, fromStatus: null, toStatus: listing.status, reason: "published" },
    }),
  ]);
}

export async function deleteListing(userId: string, listingId: string) {
  const listing = await getOwnedListing(userId, listingId);
  if (listing.status === "SOLD") throw conflict("Sold listings are kept for your records and can't be deleted.");
  const conversations = await db.conversation.count({ where: { listingId } });
  if (conversations > 0) {
    throw conflict("Buyers have already messaged you about this item. Withdraw it instead of deleting it.");
  }
  const images = await db.listingImage.findMany({ where: { listingId }, select: { url: true } });
  await db.listing.delete({ where: { id: listingId } });
  await deleteBlobs(images.map((i) => i.url));
}

/** Detail view. Drafts are only visible to their owner; everyone else gets a 404. */
export async function getListingForViewer(listingId: string, viewerId: string) {
  const listing = await db.listing.findUnique({
    where: { id: listingId },
    select: {
      id: true,
      title: true,
      description: true,
      category: true,
      condition: true,
      priceInr: true,
      pickupLocation: true,
      status: true,
      publishedAt: true,
      createdAt: true,
      updatedAt: true,
      sellerId: true,
      reservedForId: true,
      reservedPrice: true,
      reservedUntil: true,
      seller: { select: { id: true, name: true } },
      images: { orderBy: { position: "asc" }, select: { id: true, url: true, position: true } },
    },
  });
  if (!listing) return null;
  if (!listing.publishedAt && listing.sellerId !== viewerId) return null;
  return listing;
}

export async function getListingForEdit(userId: string, listingId: string) {
  const listing = await db.listing.findUnique({
    where: { id: listingId },
    select: {
      id: true,
      sellerId: true,
      title: true,
      description: true,
      category: true,
      condition: true,
      priceInr: true,
      pickupLocation: true,
      status: true,
      publishedAt: true,
      images: { orderBy: { position: "asc" }, select: { id: true, url: true, position: true } },
      _count: { select: { conversations: true } },
    },
  });
  if (!listing || listing.sellerId !== userId) return null;
  return listing;
}

export async function listMyListings(userId: string) {
  return db.listing.findMany({
    where: { sellerId: userId },
    orderBy: { updatedAt: "desc" },
    select: listingCardSelect,
  });
}
