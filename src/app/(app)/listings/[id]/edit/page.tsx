import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { pageVerifiedUser } from "@/lib/authz";
import { getListingForEdit } from "@/lib/services/listings";
import { Card, PageHeader } from "@/components/ui";
import { ListingForm } from "@/components/listing-form";
import { PhotoManager } from "@/components/photo-manager";
import { DeleteListingButton, PublishButton } from "@/components/owner-actions";
import { StatusBadge, displayStatus } from "@/components/status-badge";

export const metadata: Metadata = { title: "Edit listing" };

export default async function EditListingPage({ params }: PageProps<"/listings/[id]/edit">) {
  const user = await pageVerifiedUser();
  const { id } = await params;
  const listing = await getListingForEdit(user.id, id);
  // Non-owners get the same 404 as a missing listing, so drafts can't be probed.
  if (!listing) notFound();

  const sold = listing.status === "SOLD";
  const isDraft = !listing.publishedAt;

  return (
    <>
      <PageHeader
        eyebrow={isDraft ? "Step 2 of 2 · Photos" : "Edit listing"}
        title={listing.title}
        subtitle={isDraft ? "Add 1–5 photos, then publish so buyers can find it." : undefined}
        action={
          <div className="flex items-center gap-3">
            <StatusBadge status={displayStatus(listing)} />
            {!isDraft && (
              <Link href={`/listings/${listing.id}`} className="text-sm font-semibold text-brand hover:underline">
                View listing →
              </Link>
            )}
          </div>
        }
      />

      {sold && (
        <p className="mb-4 rounded-xl border border-line bg-sold-soft px-4 py-3 text-sm">This item is sold, so its details are locked.</p>
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
        <Card className="p-5 sm:p-6">
          <h2 className="mb-4 font-display text-xl font-semibold">Photos</h2>
          {sold ? (
            <p className="text-sm text-muted">Photos can&apos;t be changed on a sold listing.</p>
          ) : (
            <PhotoManager listingId={listing.id} initial={listing.images} published={!isDraft} />
          )}
          {isDraft && (
            <div className="mt-6 border-t border-line pt-5">
              <PublishButton listingId={listing.id} hasPhotos={listing.images.length > 0} />
              {listing.images.length === 0 && <p className="mt-2 text-xs text-muted">Add at least one photo to publish.</p>}
            </div>
          )}
        </Card>

        <Card className="p-5 sm:p-6">
          <h2 className="mb-4 font-display text-xl font-semibold">Details</h2>
          <ListingForm
            mode="edit"
            listingId={listing.id}
            disabled={sold}
            initial={{
              title: listing.title,
              description: listing.description,
              category: listing.category,
              condition: listing.condition,
              priceInr: listing.priceInr,
              pickupLocation: listing.pickupLocation,
            }}
          />
        </Card>
      </div>

      {!sold && listing._count.conversations === 0 && (
        <div className="mt-8 border-t border-line pt-6">
          <DeleteListingButton listingId={listing.id} />
        </div>
      )}
    </>
  );
}
