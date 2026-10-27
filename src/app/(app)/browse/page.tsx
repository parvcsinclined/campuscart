import type { Metadata } from "next";
import Link from "next/link";
import { pageVerifiedUser } from "@/lib/authz";
import { searchListings } from "@/lib/services/search";
import { parseSearchParams, toQueryString } from "@/lib/validation/search";
import { ButtonLink, EmptyState, PageHeader } from "@/components/ui";
import { FilterBar } from "@/components/filter-bar";
import { ListingCard } from "@/components/listing-card";

export const metadata: Metadata = { title: "Browse" };

export default async function BrowsePage({ searchParams }: PageProps<"/browse">) {
  await pageVerifiedUser();
  const filters = parseSearchParams(await searchParams);
  const result = await searchListings(filters);
  const hasQuery = Boolean(filters.q || filters.category || filters.condition || filters.minPrice !== undefined || filters.maxPrice !== undefined);

  return (
    <>
      <PageHeader
        eyebrow="Marketplace"
        title="Browse"
        subtitle="Second-hand finds from students on your campus."
        action={<ButtonLink href="/sell">+ Sell an item</ButtonLink>}
      />
      {/* key resets the uncontrolled inputs when the URL changes (e.g. "Clear all"). */}
      <FilterBar key={toQueryString(filters)} filters={filters} sort={result.sort} />

      {result.items.length === 0 ? (
        filters.page > 1 ? (
          <EmptyState
            title="No more results"
            body="This page is past the end of the results."
            action={<ButtonLink href={`/browse${toQueryString(filters, { page: 1 })}`}>Back to page 1</ButtonLink>}
          />
        ) : hasQuery ? (
          <EmptyState
            title="Nothing matches those filters"
            body={
              filters.reserved
                ? "Try a different keyword or widen the price range."
                : "Try a different keyword, widen the price range, or include reserved items."
            }
            action={<ButtonLink href="/browse" variant="secondary">Clear filters</ButtonLink>}
          />
        ) : (
          <EmptyState title="No listings yet" body="Be the first to list something. Buyers on campus will see it here." action={<ButtonLink href="/sell">List an item</ButtonLink>} />
        )
      ) : (
        <>
          <p className="mb-3 text-sm text-muted" aria-live="polite">
            {result.total} {result.total === 1 ? "item" : "items"}
            {filters.q ? <> for &ldquo;{filters.q}&rdquo;</> : null}
          </p>
          <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4">
            {result.items.map((l) => (
              <ListingCard key={l.id} listing={l} />
            ))}
          </div>
          {result.pageCount > 1 && (
            <nav aria-label="Pagination" className="mt-8 flex items-center justify-center gap-2 text-sm">
              {filters.page > 1 && (
                <Link className="rounded-xl border border-line bg-surface px-4 py-2 font-semibold" href={`/browse${toQueryString(filters, { page: filters.page - 1 })}`}>
                  ← Previous
                </Link>
              )}
              <span className="px-2 text-muted">
                Page {result.page} of {result.pageCount}
              </span>
              {filters.page < result.pageCount && (
                <Link className="rounded-xl border border-line bg-surface px-4 py-2 font-semibold" href={`/browse${toQueryString(filters, { page: filters.page + 1 })}`}>
                  Next →
                </Link>
              )}
            </nav>
          )}
        </>
      )}
    </>
  );
}
