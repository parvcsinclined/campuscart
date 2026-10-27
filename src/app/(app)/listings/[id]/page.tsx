import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { pageVerifiedUser } from "@/lib/authz";
import { getListingForViewer } from "@/lib/services/listings";
import { formatInr, timeAgo } from "@/lib/format";
import { CATEGORY_LABEL, CONDITION_LABEL } from "@/lib/validation/listing";
import { ButtonLink, Card } from "@/components/ui";
import { StatusBadge, displayStatus } from "@/components/status-badge";
import { Gallery } from "@/components/gallery";

export async function generateMetadata({ params }: PageProps<"/listings/[id]">): Promise<Metadata> {
  const user = await pageVerifiedUser();
  const { id } = await params;
  const listing = await getListingForViewer(id, user.id);
  return { title: listing?.title ?? "Listing not found" };
}

export default async function ListingPage({ params }: PageProps<"/listings/[id]">) {
  const user = await pageVerifiedUser();
  const { id } = await params;
  const listing = await getListingForViewer(id, user.id);
  if (!listing) notFound();

  const isOwner = listing.sellerId === user.id;
  const status = displayStatus(listing);

  return (
    <div className="grid gap-8 lg:grid-cols-[1.2fr_1fr]">
      <Gallery images={listing.images} title={listing.title} />

      <div className="flex flex-col gap-5">
        <div>
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <StatusBadge status={status} />
            <span className="text-xs text-muted">
              {CATEGORY_LABEL[listing.category]} · listed {timeAgo(listing.publishedAt ?? listing.createdAt)}
            </span>
          </div>
          <h1 className="font-display text-3xl font-bold tracking-tight">{listing.title}</h1>
          <p className="mt-2 font-display text-3xl font-bold text-brand">{formatInr(listing.priceInr)}</p>
        </div>

        <Card className="divide-y divide-line text-sm">
          <Fact label="Condition" value={CONDITION_LABEL[listing.condition]} />
          <Fact label="Pickup on campus" value={listing.pickupLocation} />
          <Fact label="Seller" value={isOwner ? "You" : listing.seller.name} />
        </Card>

        {isOwner ? (
          <Card className="flex flex-col gap-3 p-4">
            <p className="text-sm font-semibold">This is your listing</p>
            <div className="flex flex-wrap gap-2">
              {listing.status !== "SOLD" && (
                <ButtonLink href={`/listings/${listing.id}/edit`} variant="secondary">
                  {listing.publishedAt ? "Edit listing" : "Finish & publish"}
                </ButtonLink>
              )}
              <ButtonLink href="/my/listings" variant="ghost">
                My listings
              </ButtonLink>
            </div>
          </Card>
        ) : (
          <Card className="p-4 text-sm text-muted">
            {listing.status === "AVAILABLE"
              ? "Messaging and offers are coming in the next update."
              : listing.status === "RESERVED"
                ? "This item is reserved for another buyer right now."
                : listing.status === "SOLD"
                  ? "This item has been sold."
                  : "The seller has withdrawn this listing."}
          </Card>
        )}

        <section>
          <h2 className="mb-2 font-display text-lg font-semibold">Description</h2>
          {/* Rendered as text: React escapes user content; whitespace preserved via CSS. */}
          <p className="whitespace-pre-line text-[15px] leading-relaxed">{listing.description}</p>
        </section>

        <Link href="/browse" className="text-sm font-semibold text-brand hover:underline">
          ← Back to Browse
        </Link>
      </div>
    </div>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 px-4 py-3">
      <span className="text-muted">{label}</span>
      <span className="text-right font-medium">{value}</span>
    </div>
  );
}
