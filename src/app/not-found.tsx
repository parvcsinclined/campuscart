import type { Metadata } from "next";
import { Logo } from "@/components/logo";
import { ButtonLink } from "@/components/ui";

export const metadata: Metadata = { title: "Not found" };

export default function NotFound() {
  return (
    <div className="flex min-h-full flex-1 flex-col">
      <header className="mx-auto flex h-16 w-full max-w-6xl items-center px-4">
        <Logo />
      </header>
      <main className="flex flex-1 flex-col items-center justify-center gap-3 px-4 pb-24 text-center">
        <p className="text-xs font-semibold uppercase tracking-wider text-brand">404</p>
        <h1 className="font-display text-4xl font-bold tracking-tight">This item has left campus</h1>
        <p className="max-w-md text-muted">The page or listing you&apos;re looking for doesn&apos;t exist or was removed.</p>
        <ButtonLink href="/browse" className="mt-2">Back to Browse</ButtonLink>
      </main>
    </div>
  );
}
