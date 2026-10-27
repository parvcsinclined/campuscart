import "server-only";
import { Prisma } from "@/generated/prisma/client";
import { db } from "../db";
import { PAGE_SIZE, effectiveSort, toPrefixTsQuery, type SearchFilters } from "../validation/search";
import type { ListingCardData } from "@/components/listing-card";
import { expireStaleReservations } from "./lifecycle";

type Row = Omit<ListingCardData, "images"> & { coverUrl: string | null; total: bigint };

/**
 * Full-text search over the generated, GIN-indexed "searchVector" column plus
 * filters, sorting and pagination in one query. All values are bound parameters;
 * the only interpolated SQL fragments are fixed strings chosen in code.
 */
export async function searchListings(f: SearchFilters) {
  await expireStaleReservations();
  const tsQuery = toPrefixTsQuery(f.q);
  const sort = effectiveSort(f);
  const statuses = f.reserved ? ["AVAILABLE", "RESERVED"] : ["AVAILABLE"];

  const where: Prisma.Sql[] = [
    Prisma.sql`l."publishedAt" IS NOT NULL`,
    Prisma.sql`l."status"::text IN (${Prisma.join(statuses)})`,
  ];
  if (tsQuery) where.push(Prisma.sql`l."searchVector" @@ to_tsquery('english', ${tsQuery})`);
  if (f.category) where.push(Prisma.sql`l."category"::text = ${f.category}`);
  if (f.condition) where.push(Prisma.sql`l."condition"::text = ${f.condition}`);
  if (f.minPrice !== undefined) where.push(Prisma.sql`l."priceInr" >= ${f.minPrice}`);
  if (f.maxPrice !== undefined) where.push(Prisma.sql`l."priceInr" <= ${f.maxPrice}`);

  const orderBy = {
    relevance: tsQuery
      ? Prisma.sql`ts_rank(l."searchVector", to_tsquery('english', ${tsQuery})) DESC, l."publishedAt" DESC`
      : Prisma.sql`l."publishedAt" DESC`,
    newest: Prisma.sql`l."publishedAt" DESC`,
    price_asc: Prisma.sql`l."priceInr" ASC, l."publishedAt" DESC`,
    price_desc: Prisma.sql`l."priceInr" DESC, l."publishedAt" DESC`,
  }[sort];

  const offset = (f.page - 1) * PAGE_SIZE;
  const rows = await db.$queryRaw<Row[]>`
    SELECT l."id", l."title", l."priceInr", l."category", l."condition", l."status",
           l."publishedAt", l."pickupLocation",
           (SELECT i."url" FROM "ListingImage" i WHERE i."listingId" = l."id" ORDER BY i."position" LIMIT 1) AS "coverUrl",
           COUNT(*) OVER() AS "total"
    FROM "Listing" l
    WHERE ${Prisma.join(where, " AND ")}
    ORDER BY ${orderBy}, l."id"
    LIMIT ${PAGE_SIZE} OFFSET ${offset}`;

  const total = rows.length ? Number(rows[0].total) : 0;
  return {
    items: rows.map(
      (r): ListingCardData => ({
        id: r.id,
        title: r.title,
        priceInr: r.priceInr,
        category: r.category,
        condition: r.condition,
        status: r.status,
        publishedAt: r.publishedAt,
        pickupLocation: r.pickupLocation,
        images: r.coverUrl ? [{ url: r.coverUrl }] : [],
      }),
    ),
    total,
    page: f.page,
    pageCount: Math.max(1, Math.ceil(total / PAGE_SIZE)),
    sort,
  };
}
