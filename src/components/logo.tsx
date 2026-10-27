import Link from "next/link";

export function LogoMark({ className = "size-8" }: { className?: string }) {
  // A price tag with a campus "pin" hole.
  return (
    <svg viewBox="0 0 32 32" aria-hidden className={className}>
      <rect width="32" height="32" rx="9" className="fill-brand" />
      <path
        d="M9 10.5A1.5 1.5 0 0 1 10.5 9h6.4a2 2 0 0 1 1.42.59l5.1 5.1a2 2 0 0 1 0 2.82l-6.4 6.4a2 2 0 0 1-2.82 0l-5.1-5.1A2 2 0 0 1 9 17.4z"
        className="fill-brand-ink"
      />
      <circle cx="13.5" cy="13.5" r="1.8" className="fill-brand" />
    </svg>
  );
}

export function Logo({ href = "/" }: { href?: string }) {
  return (
    <Link href={href} className="flex items-center gap-2 font-display text-lg font-bold tracking-tight">
      <LogoMark />
      CampusCart
    </Link>
  );
}
