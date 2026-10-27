import Image from "next/image";
import Link from "next/link";
import { formatInr } from "@/lib/format";
import type { listTransactions } from "@/lib/services/transactions";
import { ButtonLink, EmptyState, PageHeader } from "./ui";

type Rows = Awaited<ReturnType<typeof listTransactions>>;

export function TransactionsView({ as, rows }: { as: "buyer" | "seller"; rows: Rows }) {
  const tab = (href: string, label: string, active: boolean) => (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className="rounded-lg px-3 py-2 text-sm font-semibold text-muted aria-[current=page]:bg-brand-soft aria-[current=page]:text-brand"
    >
      {label}
    </Link>
  );
  const total = rows.reduce((sum, r) => sum + r.finalPrice, 0);
  return (
    <>
      <PageHeader eyebrow="Completed deals" title={as === "buyer" ? "My purchases" : "My sales"} subtitle={rows.length ? `${rows.length} completed · ${formatInr(total)} total` : undefined} />
      <div className="mb-4 flex gap-1">
        {tab("/my/purchases", "Purchases", as === "buyer")}
        {tab("/my/sales", "Sales", as === "seller")}
      </div>
      {rows.length === 0 ? (
        <EmptyState
          title={as === "buyer" ? "No purchases yet" : "No sales yet"}
          body={as === "buyer" ? "When a seller marks your reserved item as sold, it shows up here." : "Items you mark as sold show up here with the final price."}
          action={as === "buyer" ? <ButtonLink href="/browse">Browse listings</ButtonLink> : <ButtonLink href="/my/listings">My listings</ButtonLink>}
        />
      ) : (
        <ul className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-surface">
          {rows.map((r) => (
            <li key={r.id}>
              <Link href={`/listings/${r.listing.id}`} className="flex items-center gap-3 p-3 hover:bg-surface-2 sm:p-4">
                <div className="relative size-14 shrink-0 overflow-hidden rounded-xl bg-surface-2">
                  {r.listing.images[0] && <Image src={r.listing.images[0].url} alt="" fill sizes="56px" className="object-cover" />}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">{r.listing.title}</p>
                  <p className="text-xs text-muted">
                    {as === "buyer" ? `From ${r.seller.name}` : `To ${r.buyer.name}`} · {r.completedAt.toLocaleDateString("en-IN", { dateStyle: "medium" })}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-display text-lg font-bold">{formatInr(r.finalPrice)}</p>
                  {r.finalPrice !== r.listing.priceInr && <p className="text-xs text-muted line-through">{formatInr(r.listing.priceInr)}</p>}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
