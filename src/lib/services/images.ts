import "server-only";
import { db } from "../db";
import { badRequest, conflict, forbidden, notFound } from "../errors";
import { assertListingOwner } from "../authz";
import { deleteBlobs, inspectBlob } from "../blob";
import { ALLOWED_IMAGE_TYPES, MAX_IMAGE_BYTES, MAX_IMAGES, listingImagePathPattern } from "../validation/listing";

async function getEditableOwnedListing(userId: string, listingId: string) {
  const listing = await db.listing.findUnique({
    where: { id: listingId },
    select: { id: true, sellerId: true, status: true, publishedAt: true, _count: { select: { images: true } } },
  });
  if (!listing) throw notFound("Listing not found.");
  assertListingOwner({ id: userId }, listing);
  if (listing.status === "SOLD") throw conflict("Sold listings can't be edited.");
  return listing;
}

/** Called before issuing an upload token: ownership, photo count, and pathname shape. */
export async function authorizeImageUpload(userId: string, listingId: string, pathname: string) {
  const listing = await getEditableOwnedListing(userId, listingId);
  if (listing._count.images >= MAX_IMAGES) throw conflict(`A listing can have at most ${MAX_IMAGES} photos.`);
  if (!listingImagePathPattern(listingId).test(pathname)) throw forbidden("Invalid upload path.");
}

/**
 * Records an uploaded blob against the listing. We re-check ownership and then ask
 * Blob for the object's metadata, so a client can't attach arbitrary URLs or oversized files.
 */
export async function attachImage(userId: string, listingId: string, url: string, pathname: string) {
  const listing = await getEditableOwnedListing(userId, listingId);
  if (!listingImagePathPattern(listingId).test(pathname)) throw forbidden("Invalid upload path.");

  const meta = await inspectBlob(url);
  if (!meta || meta.pathname !== pathname) throw badRequest("We couldn't find that upload. Please try again.");
  if (!(ALLOWED_IMAGE_TYPES as readonly string[]).includes(meta.contentType) || meta.size > MAX_IMAGE_BYTES) {
    await deleteBlobs([url]);
    throw badRequest("Photos must be JPEG, PNG or WebP and at most 5 MB.");
  }

  // Idempotent: retrying the attach call after a network blip must not duplicate the photo.
  const existing = await db.listingImage.findFirst({ where: { listingId, pathname }, select: { id: true, url: true, position: true } });
  if (existing) return existing;

  if (listing._count.images >= MAX_IMAGES) {
    await deleteBlobs([url]);
    throw conflict(`A listing can have at most ${MAX_IMAGES} photos.`);
  }
  const last = await db.listingImage.findFirst({ where: { listingId }, orderBy: { position: "desc" }, select: { position: true } });
  return db.listingImage.create({
    data: { listingId, url: meta.url, pathname, position: (last?.position ?? -1) + 1 },
    select: { id: true, url: true, position: true },
  });
}

export async function removeImage(userId: string, listingId: string, imageId: string) {
  const listing = await getEditableOwnedListing(userId, listingId);
  const image = await db.listingImage.findFirst({ where: { id: imageId, listingId }, select: { id: true, url: true } });
  if (!image) throw notFound("Photo not found.");
  if (listing.publishedAt && listing._count.images <= 1) {
    throw conflict("A published listing needs at least one photo. Add another before removing this one.");
  }
  await db.listingImage.delete({ where: { id: image.id } });
  await deleteBlobs([image.url]);
}
