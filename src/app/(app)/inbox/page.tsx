import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { pageVerifiedUser } from "@/lib/authz";
import { listInbox } from "@/lib/services/conversations";
import { timeAgo } from "@/lib/format";
import { ButtonLink, EmptyState, PageHeader } from "@/components/ui";
import { StatusBadge } from "@/components/status-badge";

export const metadata: Metadata = { title: "Inbox" };

export default async function InboxPage() {
  const user = await pageVerifiedUser();
  const rows = await listInbox(user.id);

  return (
    <>
      <PageHeader eyebrow="Messages" title="Inbox" subtitle="Inquiries on your listings and items you're interested in." />
      {rows.length === 0 ? (
        <EmptyState
          title="No conversations yet"
          body="Open any listing and tap “Message seller” to ask a question or make an offer."
          action={<ButtonLink href="/browse">Browse listings</ButtonLink>}
        />
      ) : (
        <ul className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-surface">
          {rows.map((r) => (
            <li key={r.id}>
              <Link href={`/inbox/${r.id}`} className="flex items-center gap-3 p-3 transition hover:bg-surface-2 sm:p-4">
                <div className="relative size-14 shrink-0 overflow-hidden rounded-xl bg-surface-2">
                  {r.coverUrl && <Image src={r.coverUrl} alt="" fill sizes="56px" className="object-cover" />}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className={`truncate ${r.unread ? "font-bold" : "font-semibold"}`}>{r.listingTitle}</p>
                    <StatusBadge status={r.listingStatus as "AVAILABLE"} className="hidden sm:inline-flex" />
                  </div>
                  <p className="text-xs text-muted">
                    {r.role === "buyer" ? "Seller" : "Buyer"}: {r.counterpartName}
                  </p>
                  <p className={`truncate text-sm ${r.unread ? "text-ink" : "text-muted"}`}>{r.lastBody ?? "No messages yet"}</p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1">
                  <span className="text-xs text-muted">{timeAgo(r.lastMessageAt)}</span>
                  {r.unread > 0 && (
                    <span className="grid min-w-6 place-items-center rounded-full bg-danger px-1.5 text-xs font-bold text-white" aria-label={`${r.unread} unread`}>
                      {r.unread}
                    </span>
                  )}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
