"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { Logo } from "./logo";
import { LogoutButton } from "./logout-button";

const NAV = [
  { href: "/browse", label: "Browse", icon: "M11 4a7 7 0 1 0 4.2 12.6l3.6 3.6 1.4-1.4-3.6-3.6A7 7 0 0 0 11 4Zm0 2a5 5 0 1 1 0 10 5 5 0 0 1 0-10Z" },
  { href: "/sell", label: "Sell", icon: "M11 5h2v6h6v2h-6v6h-2v-6H5v-2h6z" },
  { href: "/inbox", label: "Inbox", icon: "M4 5h16a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H8l-4 3V6a1 1 0 0 1 1-1Zm1 2v9.2L7.3 15H19V7Z" },
  { href: "/my/listings", label: "My listings", short: "Listings", icon: "M5 4h14v2H5zm0 5h14v2H5zm0 5h14v2H5zm0 5h9v2H5z" },
  { href: "/my/purchases", label: "Purchases & sales", short: "Orders", icon: "M7 4h10l1 4H6zm-2 6h14l-1.2 9.1a1 1 0 0 1-1 .9H7.2a1 1 0 0 1-1-.9z" },
  { href: "/profile", label: "Profile", icon: "M12 4a4 4 0 1 1 0 8 4 4 0 0 1 0-8Zm0 10c4.4 0 8 2 8 4.5V20H4v-1.5C4 16 7.6 14 12 14Z" },
];

function isActive(pathname: string, href: string) {
  if (href === "/my/purchases") return pathname.startsWith("/my/purchases") || pathname.startsWith("/my/sales");
  return pathname === href || pathname.startsWith(href + "/");
}

export function AppShell({ children, user }: { children: ReactNode; user: { name: string; email: string } }) {
  const pathname = usePathname();
  const unread = useUnreadCount(pathname);
  return (
    <div className="flex min-h-full flex-1 flex-col">
      <header className="sticky top-0 z-40 border-b border-line bg-bg/85 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-6 px-4">
          <Logo href="/browse" />
          {/* Current account, always visible (also on phones), so it's obvious who you're acting as. */}
          <div className="ml-auto flex min-w-0 items-center gap-2 md:order-last md:ml-0">
            <span className="hidden min-w-0 flex-col text-right leading-tight sm:flex" title={user.email}>
              <span className="truncate text-sm font-semibold">{user.name}</span>
              <span className="truncate text-xs text-muted">{user.email}</span>
            </span>
            <span
              aria-hidden
              className="grid size-9 shrink-0 place-items-center rounded-full bg-brand-soft font-display text-sm font-bold text-brand sm:hidden"
              title={user.email}
            >
              {user.name.charAt(0).toUpperCase()}
            </span>
            <LogoutButton variant="ghost" className="h-9 px-3" />
          </div>
          <nav aria-label="Main" className="hidden items-center gap-1 md:flex">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                aria-current={isActive(pathname, item.href) ? "page" : undefined}
                className="relative rounded-lg px-3 py-2 text-sm font-medium text-muted transition hover:bg-surface-2 hover:text-ink aria-[current=page]:bg-brand-soft aria-[current=page]:text-brand"
              >
                {item.label}
                {item.href === "/inbox" && unread > 0 && <UnreadDot count={unread} />}
              </Link>
            ))}
          </nav>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 pt-6 pb-28 md:pb-12">{children}</main>

      <nav
        aria-label="Main"
        className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-6 border-t border-line bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
      >
        {NAV.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            aria-current={isActive(pathname, item.href) ? "page" : undefined}
            className="relative flex flex-col items-center gap-0.5 py-2 text-[11px] font-medium text-muted aria-[current=page]:text-brand"
          >
            <svg viewBox="0 0 24 24" aria-hidden className="size-6 fill-current">
              <path d={item.icon} />
            </svg>
            <span className="truncate">{item.short ?? item.label}</span>
            {item.href === "/inbox" && unread > 0 && <UnreadDot count={unread} mobile />}
          </Link>
        ))}
      </nav>
    </div>
  );
}

function UnreadDot({ count, mobile }: { count: number; mobile?: boolean }) {
  return (
    <span
      aria-label={`${count} unread`}
      className={`absolute grid min-w-5 place-items-center rounded-full bg-danger px-1 text-[10px] font-bold text-white ${mobile ? "top-1 right-[calc(50%-20px)]" : "-top-1 -right-1"}`}
    >
      {count > 99 ? "99+" : count}
    </span>
  );
}

/** Polls the unread total for the nav badge; re-checks on navigation and when the tab regains focus. */
function useUnreadCount(pathname: string) {
  const [unread, setUnread] = useState(0);
  useEffect(() => {
    let alive = true;
    const load = async () => {
      if (document.hidden) return;
      try {
        const res = await fetch("/api/inbox/unread", { cache: "no-store" });
        if (res.ok && alive) setUnread((await res.json()).unread ?? 0);
      } catch {
        // Badge is best-effort; ignore network blips.
      }
    };
    void load();
    const timer = setInterval(load, 15000);
    document.addEventListener("visibilitychange", load);
    return () => {
      alive = false;
      clearInterval(timer);
      document.removeEventListener("visibilitychange", load);
    };
  }, [pathname]);
  return unread;
}
