import Image from "next/image";
import Link from "next/link";
import { formatInr } from "@/lib/format";
import { CATEGORY_LABEL, CONDITION_LABEL } from "@/lib/validation/listing";
import { StatusBadge, displayStatus } from "./status-badge";

export type ListingCardData = {
  id: string;
  title: string;
  priceInr: number;
  category: keyof typeof CATEGORY_LABEL;
  condition: keyof typeof CONDITION_LABEL;
  status: "AVAILABLE" | "RESERVED" | "SOLD" | "WITHDRAWN";
  publishedAt: Date | null;
  pickupLocation: string;
  images: { url: string }[];
};

export function ListingCard({ listing, href }: { listing: ListingCardData; href?: string }) {
  const cover = listing.images[0]?.url;
  const status = displayStatus(listing);
  return (
    <Link
      href={href ?? `/listings/${listing.id}`}
      className="group flex flex-col overflow-hidden rounded-2xl border border-line bg-surface transition hover:-translate-y-0.5 hover:shadow-lg"
    >
      <div className="relative aspect-[4/3] bg-surface-2">
        {cover ? (
          <Image src={cover} alt="" fill sizes="(max-width: 768px) 50vw, 25vw" className="object-cover" />
        ) : (
          <div className="grid size-full place-items-center text-sm text-muted">No photo yet</div>
        )}
        {status !== "AVAILABLE" && <StatusBadge status={status} className="absolute top-2 left-2 shadow-sm" />}
      </div>
      <div className="flex flex-1 flex-col gap-1 p-3">
        <p className="font-display text-lg font-bold">{formatInr(listing.priceInr)}</p>
        <p className="line-clamp-2 text-sm font-medium leading-snug">{listing.title}</p>
        <p className="mt-auto pt-1 text-xs text-muted">
          {CONDITION_LABEL[listing.condition]} · {listing.pickupLocation}
        </p>
      </div>
    </Link>
  );
}
