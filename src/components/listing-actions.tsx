"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api-client";
import { Button } from "./ui";
import { useToast } from "./toaster";
import { ConfirmButton } from "./confirm-button";

export function MessageSellerButton({ listingId, existingConversationId }: { listingId: string; existingConversationId?: string }) {
  const router = useRouter();
  const toast = useToast();
  const [pending, setPending] = useState(false);

  if (existingConversationId) {
    return (
      <Button className="w-full" onClick={() => router.push(`/inbox/${existingConversationId}`)}>
        Open conversation
      </Button>
    );
  }
  return (
    <Button
      className="w-full"
      loading={pending}
      onClick={async () => {
        setPending(true);
        const res = await api<{ id: string }>(`/api/listings/${listingId}/conversations`, { method: "POST" });
        if (!res.ok) {
          toast(res.message, "error");
          setPending(false);
          return;
        }
        router.push(`/inbox/${res.data.id}`);
      }}
    >
      Message seller / make an offer
    </Button>
  );
}

export function OwnerLifecycleButtons({ listingId, status }: { listingId: string; status: string }) {
  const router = useRouter();
  const toast = useToast();

  async function run(action: "withdraw" | "relist", success: string) {
    const res = await api(`/api/listings/${listingId}/transition`, { body: { action } });
    if (!res.ok) toast(res.message, "error");
    else toast(success, "success");
    router.refresh();
  }

  if (status === "AVAILABLE" || status === "RESERVED") {
    return (
      <ConfirmButton
        variant="danger"
        prompt={status === "RESERVED" ? "Withdraw? The reservation will be cancelled." : "Withdraw from the marketplace?"}
        confirmLabel="Withdraw"
        onConfirm={() => run("withdraw", "Listing withdrawn.")}
      >
        Withdraw listing
      </ConfirmButton>
    );
  }
  if (status === "WITHDRAWN") {
    return (
      <ConfirmButton prompt="Make this listing available again?" confirmLabel="Relist" variant="primary" onConfirm={() => run("relist", "Listing is available again.")}>
        Relist
      </ConfirmButton>
    );
  }
  return null;
}
