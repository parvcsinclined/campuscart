"use client";

import { useEffect } from "react";
import { Button, ButtonLink } from "@/components/ui";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-3 px-4 py-24 text-center">
      <p className="text-xs font-semibold uppercase tracking-wider text-danger">Something went wrong</p>
      <h1 className="font-display text-3xl font-bold tracking-tight">We couldn&apos;t load this page</h1>
      <p className="max-w-md text-muted">
        It&apos;s probably temporary. Try again, and if it keeps happening, come back in a few minutes.
        {error.digest && <span className="mt-2 block text-xs">Reference: {error.digest}</span>}
      </p>
      <div className="mt-2 flex gap-2">
        <Button onClick={reset}>Try again</Button>
        <ButtonLink href="/browse" variant="secondary">Go to Browse</ButtonLink>
      </div>
    </main>
  );
}
