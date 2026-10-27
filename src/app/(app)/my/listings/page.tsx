import type { Metadata } from "next";
import { pageVerifiedUser } from "@/lib/authz";
import { listMyListings } from "@/lib/services/listings";
import { ButtonLink, EmptyState, PageHeader } from "@/components/ui";
import { ListingCard } from "@/components/listing-card";

export const metadata: Metadata = { title: "My listings" };

const GROUPS = [
  { key: "DRAFT", title: "Drafts", hint: "Not visible to buyers yet. Add photos and publish." },
  { key: "AVAILABLE", title: "Available" },
  { key: "RESERVED", title: "Reserved" },
  { key: "SOLD", title: "Sold" },
  { key: "WITHDRAWN", title: "Withdrawn" },
] as const;

export default async function MyListingsPage() {
  const user = await pageVerifiedUser();
  const listings = await listMyListings(user.id);
  const sellButton = <ButtonLink href="/sell">+ Sell an item</ButtonLink>;

  if (!listings.length) {
    return (
      <>
        <PageHeader eyebrow="Selling" title="My listings" />
        <EmptyState title="You haven't listed anything yet" body="Old textbooks, a calculator you no longer need, that chair in your room: list it in under a minute." action={sellButton} />
      </>
    );
  }

  return (
    <>
      <PageHeader eyebrow="Selling" title="My listings" subtitle={`${listings.length} item${listings.length === 1 ? "" : "s"}`} action={sellButton} />
      <div className="flex flex-col gap-10">
        {GROUPS.map((group) => {
          const items = listings.filter((l) => (group.key === "DRAFT" ? !l.publishedAt : l.publishedAt && l.status === group.key));
          if (!items.length) return null;
          return (
            <section key={group.key} aria-labelledby={`group-${group.key}`}>
              <h2 id={`group-${group.key}`} className="font-display text-xl font-semibold">
                {group.title} <span className="text-muted">({items.length})</span>
              </h2>
              {"hint" in group && <p className="text-sm text-muted">{group.hint}</p>}
              <div className="mt-3 grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4">
                {items.map((l) => (
                  <ListingCard key={l.id} listing={l} href={l.publishedAt ? `/listings/${l.id}` : `/listings/${l.id}/edit`} />
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </>
  );
}
