"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api-client";
import { Button } from "./ui";
import { useToast } from "./toaster";

export function PublishButton({ listingId, hasPhotos }: { listingId: string; hasPhotos: boolean }) {
  const router = useRouter();
  const toast = useToast();
  const [pending, setPending] = useState(false);

  async function publish() {
    setPending(true);
    const res = await api(`/api/listings/${listingId}/publish`, { method: "POST" });
    setPending(false);
    if (!res.ok) {
      toast(res.message, "error");
      return;
    }
    toast("Your listing is live!", "success");
    router.push(`/listings/${listingId}`);
    router.refresh();
  }

  return (
    <Button onClick={publish} loading={pending} disabled={!hasPhotos} title={hasPhotos ? undefined : "Add at least one photo first"}>
      {pending ? "Publishing…" : "Publish listing"}
    </Button>
  );
}

export function DeleteListingButton({ listingId }: { listingId: string }) {
  const router = useRouter();
  const toast = useToast();
  const [confirming, setConfirming] = useState(false);
  const [pending, setPending] = useState(false);

  async function remove() {
    setPending(true);
    const res = await api(`/api/listings/${listingId}`, { method: "DELETE" });
    setPending(false);
    if (!res.ok) {
      toast(res.message, "error");
      setConfirming(false);
      return;
    }
    toast("Listing deleted.", "success");
    router.push("/my/listings");
    router.refresh();
  }

  // Inline two-step confirm instead of window.confirm.
  if (!confirming) {
    return (
      <Button variant="danger" onClick={() => setConfirming(true)}>
        Delete listing
      </Button>
    );
  }
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-sm text-muted">Delete permanently, photos included?</span>
      <Button variant="danger" onClick={remove} loading={pending}>
        Yes, delete
      </Button>
      <Button variant="ghost" onClick={() => setConfirming(false)} disabled={pending}>
        Cancel
      </Button>
    </div>
  );
}
