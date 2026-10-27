type Status = "AVAILABLE" | "RESERVED" | "SOLD" | "WITHDRAWN" | "DRAFT";

const STYLE: Record<Status, { label: string; className: string }> = {
  AVAILABLE: { label: "Available", className: "bg-brand-soft text-brand" },
  RESERVED: { label: "Reserved", className: "bg-amber-soft text-amber" },
  SOLD: { label: "Sold", className: "bg-sold-soft text-sold" },
  WITHDRAWN: { label: "Withdrawn", className: "bg-surface-2 text-muted" },
  DRAFT: { label: "Draft", className: "border border-dashed border-line text-muted" },
};

export function StatusBadge({ status, className = "" }: { status: Status; className?: string }) {
  const s = STYLE[status];
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${s.className} ${className}`}>
      {s.label}
    </span>
  );
}

export function displayStatus(listing: { status: Exclude<Status, "DRAFT">; publishedAt: Date | null }): Status {
  return listing.publishedAt ? listing.status : "DRAFT";
}
