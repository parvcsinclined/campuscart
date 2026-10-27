import { z } from "zod";
import { CATEGORIES, CONDITIONS, MAX_PRICE_INR } from "./listing";

export const SORTS = ["relevance", "newest", "price_asc", "price_desc"] as const;
export type Sort = (typeof SORTS)[number];
export const PAGE_SIZE = 12;

// Search params come straight from the URL, so anything malformed falls back
// to a default instead of erroring: a shared link should always render results.
const optionalInt = z.preprocess(
  (v) => (v === "" || v === undefined ? undefined : Number(v)),
  z.number().int().min(0).max(MAX_PRICE_INR).optional().catch(undefined),
);

export const searchParamsSchema = z.object({
  q: z.string().trim().max(100).optional().catch(undefined),
  category: z.enum(CATEGORIES).optional().catch(undefined),
  condition: z.enum(CONDITIONS).optional().catch(undefined),
  minPrice: optionalInt,
  maxPrice: optionalInt,
  reserved: z.preprocess((v) => v === "1" || v === "true", z.boolean()).catch(false),
  sort: z.enum(SORTS).optional().catch(undefined),
  page: z.preprocess((v) => Number(v ?? 1), z.number().int().min(1).max(500)).catch(1),
});
export type SearchFilters = z.infer<typeof searchParamsSchema>;

export function parseSearchParams(raw: Record<string, string | string[] | undefined>): SearchFilters {
  const flat = Object.fromEntries(Object.entries(raw).map(([k, v]) => [k, Array.isArray(v) ? v[0] : v]));
  const parsed = searchParamsSchema.parse(flat);
  // Swap a reversed price range instead of returning nothing.
  if (parsed.minPrice !== undefined && parsed.maxPrice !== undefined && parsed.minPrice > parsed.maxPrice) {
    [parsed.minPrice, parsed.maxPrice] = [parsed.maxPrice, parsed.minPrice];
  }
  return parsed;
}

/** Relevance only makes sense with a keyword; otherwise default to newest. */
export function effectiveSort(f: Pick<SearchFilters, "q" | "sort">): Sort {
  if (f.sort === "relevance" && !f.q) return "newest";
  return f.sort ?? (f.q ? "relevance" : "newest");
}

/**
 * Turns free text into a prefix-matching tsquery: "casio calc" -> "casio:* & calc:*".
 * Only letters/digits survive, so user input can never inject tsquery operators.
 */
export function toPrefixTsQuery(q: string | undefined): string | null {
  if (!q) return null;
  const tokens = q.toLowerCase().match(/[\p{L}\p{N}]+/gu)?.slice(0, 8) ?? [];
  if (!tokens.length) return null;
  return tokens.map((t) => `${t}:*`).join(" & ");
}

/** Serialises filters back to a query string, dropping defaults, for links and pagination. */
export function toQueryString(f: Partial<SearchFilters>, overrides: Partial<SearchFilters> = {}): string {
  const merged = { ...f, ...overrides };
  const params = new URLSearchParams();
  if (merged.q) params.set("q", merged.q);
  if (merged.category) params.set("category", merged.category);
  if (merged.condition) params.set("condition", merged.condition);
  if (merged.minPrice !== undefined) params.set("minPrice", String(merged.minPrice));
  if (merged.maxPrice !== undefined) params.set("maxPrice", String(merged.maxPrice));
  if (merged.reserved) params.set("reserved", "1");
  if (merged.sort) params.set("sort", merged.sort);
  if (merged.page && merged.page > 1) params.set("page", String(merged.page));
  const s = params.toString();
  return s ? `?${s}` : "";
}
