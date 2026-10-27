import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { pageVerifiedUser } from "@/lib/authz";
import { findBuyerConversation, getListingForViewer, listListingEvents } from "@/lib/services/listings";
import { listListingConversations } from "@/lib/services/conversations";
import { formatInr, timeAgo } from "@/lib/format";
import { CATEGORY_LABEL, CONDITION_LABEL } from "@/lib/validation/listing";
import { ButtonLink, Card } from "@/components/ui";
import { StatusBadge, displayStatus } from "@/components/status-badge";
import { Gallery } from "@/components/gallery";
import { MessageSellerButton, OwnerLifecycleButtons } from "@/components/listing-actions";

const REASON_LABEL: Record<string, string> = {
  published: "Published",
  reserved: "Reserved by seller",
  offer_accepted: "Offer accepted, item reserved",
  reservation_cancelled: "Reservation cancelled by seller",
  buyer_backed_out: "Buyer backed out",
  reservation_expired: "Reservation expired after 48h",
  sold: "Marked as sold",
  withdrawn: "Withdrawn",
  relisted: "Relisted",
};

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
  const [events, conversations, myConversation] = await Promise.all([
    isOwner ? listListingEvents(listing.id) : Promise.resolve([]),
    isOwner ? listListingConversations(user.id, listing.id) : Promise.resolve([]),
    isOwner ? Promise.resolve(null) : findBuyerConversation(listing.id, user.id),
  ]);
  const reservedForMe = listing.status === "RESERVED" && listing.reservedForId === user.id;

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
            {listing.status === "RESERVED" && listing.reservedUntil && (
              <p className="rounded-lg bg-amber-soft px-3 py-2 text-sm">
                Reserved at {formatInr(listing.reservedPrice ?? listing.priceInr)} until{" "}
                {listing.reservedUntil.toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Kolkata" })}. Complete or cancel it from the
                buyer&apos;s conversation.
              </p>
            )}
            <div className="flex flex-wrap gap-2">
              {listing.status !== "SOLD" && (
                <ButtonLink href={`/listings/${listing.id}/edit`} variant="secondary">
                  {listing.publishedAt ? "Edit listing" : "Finish & publish"}
                </ButtonLink>
              )}
              {listing.publishedAt && <OwnerLifecycleButtons listingId={listing.id} status={listing.status} />}
            </div>
          </Card>
        ) : (
          <Card className="flex flex-col gap-3 p-4 text-sm">
            {reservedForMe && <p className="rounded-lg bg-amber-soft px-3 py-2">Reserved for you at {formatInr(listing.reservedPrice ?? listing.priceInr)}.</p>}
            {listing.status === "RESERVED" && !reservedForMe && <p className="text-muted">Reserved for another buyer right now. You can still message the seller.</p>}
            {listing.status === "SOLD" && <p className="text-muted">This item has been sold.</p>}
            {listing.status === "WITHDRAWN" && <p className="text-muted">The seller has withdrawn this listing.</p>}
            {(myConversation || listing.status === "AVAILABLE" || listing.status === "RESERVED") && (
              <MessageSellerButton listingId={listing.id} existingConversationId={myConversation?.id} />
            )}
          </Card>
        )}

        <section>
          <h2 className="mb-2 font-display text-lg font-semibold">Description</h2>
          {/* Rendered as text: React escapes user content; whitespace preserved via CSS. */}
          <p className="whitespace-pre-line text-[15px] leading-relaxed">{listing.description}</p>
        </section>

        {isOwner && conversations.length > 0 && (
          <section>
            <h2 className="mb-2 font-display text-lg font-semibold">Interested buyers ({conversations.length})</h2>
            <ul className="divide-y divide-line rounded-2xl border border-line bg-surface text-sm">
              {conversations.map((c) => (
                <li key={c.id}>
                  <Link href={`/inbox/${c.id}`} className="flex justify-between gap-3 px-4 py-3 hover:bg-surface-2">
                    <span className="font-medium">{c.buyer.name}</span>
                    <span className="text-muted">{timeAgo(c.lastMessageAt)} →</span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        {isOwner && events.length > 0 && (
          <section>
            <h2 className="mb-2 font-display text-lg font-semibold">History</h2>
            <ol className="relative ml-2 border-l-2 border-line pl-5 text-sm">
              {events.map((e) => (
                <li key={e.id} className="relative pb-4 last:pb-0">
                  <span className="absolute top-1.5 -left-[27px] size-3 rounded-full border-2 border-surface bg-brand" aria-hidden />
                  <p className="font-medium">{REASON_LABEL[e.reason ?? ""] ?? `${e.fromStatus ?? "New"} → ${e.toStatus}`}</p>
                  <p className="text-xs text-muted">
                    {e.fromStatus ? `${e.fromStatus.toLowerCase()} → ` : ""}
                    {e.toStatus.toLowerCase()} · {e.actor ? e.actor.name : "System"} ·{" "}
                    {e.createdAt.toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Kolkata" })}
                  </p>
                </li>
              ))}
            </ol>
          </section>
        )}

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
