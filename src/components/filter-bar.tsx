"use client";

import Form from "next/form";
import Link from "next/link";
import { useRef, useState } from "react";
import { CATEGORIES, CATEGORY_LABEL, CONDITIONS, CONDITION_LABEL } from "@/lib/validation/listing";
import type { SearchFilters, Sort } from "@/lib/validation/search";

const SORT_LABEL: Record<Sort, string> = {
  relevance: "Best match",
  newest: "Newest",
  price_asc: "Price: low to high",
  price_desc: "Price: high to low",
};

const control =
  "h-11 w-full rounded-xl border border-line bg-surface px-3 text-sm text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand/20";

// A GET form: every filter lives in the URL, so results are shareable and survive refresh.
// next/form turns submissions into client-side navigations with the loading skeleton.
export function FilterBar({ filters, sort }: { filters: SearchFilters; sort: Sort }) {
  const formRef = useRef<HTMLFormElement>(null);
  const submit = () => formRef.current?.requestSubmit();
  const activeCount = [filters.category, filters.condition, filters.minPrice, filters.maxPrice, filters.reserved || undefined].filter(
    (v) => v !== undefined,
  ).length;
  // Filters are always shown on desktop; on phones they collapse behind a toggle.
  const [showFilters, setShowFilters] = useState(activeCount > 0);

  return (
    <Form ref={formRef} action="/browse" className="mb-6 rounded-2xl border border-line bg-surface p-3 sm:p-4" role="search">
      <div className="flex gap-2">
        <label htmlFor="q" className="sr-only">
          Search listings
        </label>
        <input
          id="q"
          name="q"
          type="search"
          defaultValue={filters.q ?? ""}
          placeholder="Search textbooks, calculators, chairs…"
          maxLength={100}
          className={`${control} flex-1 text-base`}
        />
        <button type="submit" className="h-11 shrink-0 rounded-xl bg-brand px-4 text-sm font-semibold text-brand-ink">
          Search
        </button>
      </div>

      <button
        type="button"
        onClick={() => setShowFilters((v) => !v)}
        aria-expanded={showFilters}
        aria-controls="filter-controls"
        className="mt-3 text-sm font-semibold text-brand md:hidden"
      >
        Filters{activeCount ? ` (${activeCount})` : ""} {showFilters ? "▴" : "▾"}
      </button>
      <div id="filter-controls" className={`${showFilters ? "block" : "hidden"} md:block`}>
        <div className="mt-3 grid grid-cols-2 gap-2 md:grid-cols-6">
          <select name="category" defaultValue={filters.category ?? ""} onChange={submit} aria-label="Category" className={control}>
            <option value="">All categories</option>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {CATEGORY_LABEL[c]}
              </option>
            ))}
          </select>
          <select name="condition" defaultValue={filters.condition ?? ""} onChange={submit} aria-label="Condition" className={control}>
            <option value="">Any condition</option>
            {CONDITIONS.map((c) => (
              <option key={c} value={c}>
                {CONDITION_LABEL[c]}
              </option>
            ))}
          </select>
          <input
            name="minPrice"
            type="number"
            inputMode="numeric"
            min={0}
            placeholder="Min ₹"
            defaultValue={filters.minPrice ?? ""}
            aria-label="Minimum price"
            className={control}
          />
          <input
            name="maxPrice"
            type="number"
            inputMode="numeric"
            min={0}
            placeholder="Max ₹"
            defaultValue={filters.maxPrice ?? ""}
            aria-label="Maximum price"
            className={control}
          />
          <select name="sort" defaultValue={sort} onChange={submit} aria-label="Sort by" className={control}>
            {(filters.q ? Object.keys(SORT_LABEL) : Object.keys(SORT_LABEL).filter((s) => s !== "relevance")).map((s) => (
              <option key={s} value={s}>
                {SORT_LABEL[s as Sort]}
              </option>
            ))}
          </select>
          <label className="flex h-11 items-center gap-2 rounded-xl border border-line px-3 text-sm">
            <input type="checkbox" name="reserved" value="1" defaultChecked={filters.reserved} onChange={submit} className="size-4 accent-[var(--brand)]" />
            Include reserved
          </label>
        </div>
        {activeCount > 0 || filters.q ? (
          <Link href="/browse" className="mt-3 inline-block text-sm font-semibold text-muted hover:text-ink">
            Clear all
          </Link>
        ) : null}
      </div>
    </Form>
  );
}
