"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { api } from "@/lib/api-client";
import { formatInr } from "@/lib/format";
import type { ThreadState } from "@/lib/services/conversations";
import { Button } from "./ui";
import { useToast } from "./toaster";
import { StatusBadge } from "./status-badge";
import { ConfirmButton } from "./confirm-button";

type Json<T> = T extends Date ? string : T extends object ? { [K in keyof T]: Json<T[K]> } : T;
type State = Json<ThreadState>;
type Msg = State["messages"][number];
type Offer = State["offers"][number];

const POLL_MS = 4000;

export function Thread({ initial, meId }: { initial: State; meId: string }) {
  const toast = useToast();
  const [state, setState] = useState(initial);
  const [messages, setMessages] = useState<Msg[]>(initial.messages);
  const [offline, setOffline] = useState(false);
  const cursor = useRef<string | undefined>(initial.messages.at(-1)?.createdAt);
  const bottomRef = useRef<HTMLDivElement>(null);
  const failures = useRef(0);

  const merge = useCallback((incoming: Msg[]) => {
    if (!incoming.length) return;
    setMessages((prev) => {
      const seen = new Set(prev.map((m) => m.id));
      const next = [...prev, ...incoming.filter((m) => !seen.has(m.id))];
      cursor.current = next.at(-1)?.createdAt;
      return next;
    });
  }, []);

  const refresh = useCallback(async () => {
    const qs = cursor.current ? `?after=${encodeURIComponent(cursor.current)}` : "";
    const res = await api<State>(`/api/conversations/${initial.conversation.id}${qs}`, { timeoutMs: 10000 });
    if (!res.ok) {
      failures.current += 1;
      setOffline(failures.current >= 2);
      return;
    }
    failures.current = 0;
    setOffline(false);
    setState(res.data);
    merge(res.data.messages);
    if (res.data.messages.some((m) => m.senderId !== meId)) {
      void api(`/api/conversations/${initial.conversation.id}/read`, { method: "POST" });
    }
  }, [initial.conversation.id, meId, merge]);

  // Polling: every few seconds while the tab is visible; immediately on return to the tab.
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    let stopped = false;
    const tick = async () => {
      if (!document.hidden) await refresh();
      if (!stopped) timer = setTimeout(tick, failures.current ? Math.min(POLL_MS * 2 ** failures.current, 30000) : POLL_MS);
    };
    timer = setTimeout(tick, POLL_MS);
    const onVisible = () => !document.hidden && refresh();
    document.addEventListener("visibilitychange", onVisible);
    void api(`/api/conversations/${initial.conversation.id}/read`, { method: "POST" });
    return () => {
      stopped = true;
      clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [initial.conversation.id, refresh]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end" });
  }, [messages.length]);

  /** Runs a mutation, shows its error as a toast, then refreshes the thread state. */
  async function act(url: string, body?: unknown, success?: string) {
    const res = await api(url, { method: "POST", body });
    if (!res.ok) {
      toast(res.message, "error");
      await refresh();
      return false;
    }
    if (success) toast(success, "success");
    await refresh();
    return true;
  }

  const { listing, role, counterpart, conversation } = state;
  const offersById = new Map(state.offers.map((o) => [o.id, o]));
  const pendingOffer = state.offers.find((o) => o.status === "PENDING");
  const reservedForThisBuyer = listing.status === "RESERVED" && listing.reservedForId === conversation.buyerId;
  const reservedForOther = listing.status === "RESERVED" && !reservedForThisBuyer;
  const transition = (action: string, success: string) => act(`/api/listings/${listing.id}/transition`, { action, conversationId: conversation.id }, success);

  return (
    <div className="flex h-[calc(100dvh-10rem)] flex-col md:h-[calc(100dvh-8rem)]">
      {/* Listing summary + lifecycle actions */}
      <div className="rounded-2xl border border-line bg-surface p-3">
        <div className="flex items-center gap-3">
          <Link href={`/listings/${listing.id}`} className="relative size-14 shrink-0 overflow-hidden rounded-xl bg-surface-2">
            {listing.coverUrl && <Image src={listing.coverUrl} alt="" fill sizes="56px" className="object-cover" />}
          </Link>
          <div className="min-w-0 flex-1">
            <Link href={`/listings/${listing.id}`} className="block truncate font-semibold hover:underline">
              {listing.title}
            </Link>
            <p className="text-sm text-muted">
              {formatInr(listing.priceInr)} · {role === "buyer" ? "Seller" : "Buyer"}: {counterpart.name}
            </p>
          </div>
          <StatusBadge status={listing.status} />
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-line pt-3 text-sm">
          {reservedForThisBuyer && (
            <p className="w-full rounded-lg bg-amber-soft px-3 py-2 text-ink">
              Reserved {role === "buyer" ? "for you" : `for ${counterpart.name}`} at <b>{formatInr(listing.reservedPrice ?? listing.priceInr)}</b>
              {listing.reservedUntil && <> until {new Date(listing.reservedUntil).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}</>}.
            </p>
          )}
          {reservedForOther && <p className="w-full text-muted">This item is reserved for another buyer right now.</p>}
          {listing.status === "SOLD" && (
            <p className="w-full text-muted">{reservedForThisBuyer || listing.reservedForId === conversation.buyerId ? "Sold in this conversation. 🎉" : "This item has been sold."}</p>
          )}
          {listing.status === "WITHDRAWN" && <p className="w-full text-muted">The seller withdrew this listing.</p>}

          {role === "seller" && listing.status === "AVAILABLE" && (
            <ConfirmButton
              prompt={`Reserve for ${counterpart.name} at ${formatInr(listing.priceInr)} for 48 hours?`}
              confirmLabel="Reserve"
              onConfirm={() => transition("reserve", "Reserved for 48 hours.").then(() => {})}
            >
              Reserve for {counterpart.name.split(" ")[0]}
            </ConfirmButton>
          )}
          {role === "seller" && reservedForThisBuyer && (
            <>
              <ConfirmButton prompt="Mark as sold? This is final." confirmLabel="Mark sold" variant="primary" onConfirm={() => transition("complete", "Marked as sold.").then(() => {})}>
                Mark as sold
              </ConfirmButton>
              <ConfirmButton prompt="Cancel this reservation?" confirmLabel="Cancel reservation" variant="danger" onConfirm={() => transition("cancel_reservation", "Reservation cancelled.").then(() => {})}>
                Cancel reservation
              </ConfirmButton>
            </>
          )}
          {role === "buyer" && reservedForThisBuyer && (
            <ConfirmButton prompt="Back out of this reservation?" confirmLabel="Back out" variant="danger" onConfirm={() => transition("back_out", "You backed out.").then(() => {})}>
              Back out
            </ConfirmButton>
          )}
          {role === "buyer" && listing.status === "AVAILABLE" && !pendingOffer && (
            <AmountForm label="Make an offer" placeholder={String(listing.priceInr)} onSubmit={(amountInr) => act(`/api/conversations/${conversation.id}/offers`, { amountInr }, "Offer sent.")} />
          )}
          {role === "buyer" && listing.status === "AVAILABLE" && pendingOffer && <p className="text-muted">You have a pending offer below.</p>}
        </div>
      </div>

      {/* Messages */}
      <div className="mt-3 flex-1 overflow-y-auto rounded-2xl border border-line bg-bg p-3" aria-live="polite">
        {offline && <p className="mb-2 rounded-lg bg-danger-soft px-3 py-2 text-center text-xs">Connection lost. Retrying…</p>}
        {messages.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted">
            {role === "buyer" ? "Say hi and ask anything about the item, or make an offer above." : "No messages yet."}
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {messages.map((m) => (
              <MessageItem key={m.id} m={m} meId={meId} offer={m.offerId ? offersById.get(m.offerId) : undefined} listingAvailable={listing.status === "AVAILABLE"} act={act} counterpart={counterpart.name} />
            ))}
          </ul>
        )}
        <div ref={bottomRef} />
      </div>

      <Composer conversationId={conversation.id} onSent={(m) => merge([m])} />
    </div>
  );
}

function MessageItem({
  m,
  meId,
  offer,
  listingAvailable,
  act,
  counterpart,
}: {
  m: Msg;
  meId: string;
  offer?: Offer;
  listingAvailable: boolean;
  act: (url: string, body?: unknown, success?: string) => Promise<boolean>;
  counterpart: string;
}) {
  const mine = m.senderId === meId;
  const time = new Date(m.createdAt).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" });

  if (m.type === "SYSTEM") {
    return (
      <li className="mx-auto max-w-md rounded-full bg-surface-2 px-3 py-1 text-center text-xs text-muted">
        {m.body} · {time}
      </li>
    );
  }

  if (m.type === "OFFER" && offer) {
    const isProposer = offer.proposerId === meId;
    const pending = offer.status === "PENDING";
    return (
      <li className={`max-w-[85%] ${mine ? "self-end" : "self-start"}`}>
        <div className="rounded-2xl border-2 border-brand/40 bg-surface p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-brand">{m.body.startsWith("Countered") ? "Counter-offer" : "Offer"}</p>
          <p className="font-display text-2xl font-bold">{formatInr(offer.amountInr)}</p>
          <p className="text-xs text-muted">
            {isProposer ? "You" : counterpart} · {time} · <OfferStatus status={offer.status} />
          </p>
          {pending && (
            <div className="mt-2 flex flex-wrap gap-2">
              {isProposer ? (
                <SmallAction label="Withdraw" onClick={() => act(`/api/offers/${offer.id}`, { action: "withdraw" }, "Offer withdrawn.")} />
              ) : listingAvailable ? (
                <>
                  <SmallAction primary label="Accept" onClick={() => act(`/api/offers/${offer.id}`, { action: "accept" }, "Offer accepted. The item is reserved.")} />
                  <SmallAction label="Decline" onClick={() => act(`/api/offers/${offer.id}`, { action: "reject" }, "Offer declined.")} />
                  <CounterInline onSubmit={(amountInr) => act(`/api/offers/${offer.id}`, { action: "counter", amountInr }, "Counter-offer sent.")} />
                </>
              ) : null}
            </div>
          )}
        </div>
      </li>
    );
  }

  return (
    <li className={`max-w-[85%] ${mine ? "self-end" : "self-start"}`}>
      <div className={`rounded-2xl px-3.5 py-2 text-[15px] whitespace-pre-wrap break-words ${mine ? "rounded-br-md bg-brand text-brand-ink" : "rounded-bl-md bg-surface border border-line"}`}>
        {m.body}
      </div>
      <p className={`mt-0.5 text-[11px] text-muted ${mine ? "text-right" : ""}`}>{time}</p>
    </li>
  );
}

function OfferStatus({ status }: { status: Offer["status"] }) {
  const tone: Record<Offer["status"], string> = {
    PENDING: "text-amber",
    ACCEPTED: "text-brand",
    REJECTED: "text-danger",
    COUNTERED: "text-muted",
    WITHDRAWN: "text-muted",
    EXPIRED: "text-muted",
  };
  return <span className={`font-semibold ${tone[status]}`}>{status.charAt(0) + status.slice(1).toLowerCase()}</span>;
}

function SmallAction({ label, onClick, primary }: { label: string; onClick: () => Promise<unknown>; primary?: boolean }) {
  const [pending, setPending] = useState(false);
  return (
    <Button
      variant={primary ? "primary" : "secondary"}
      className="h-9 px-3"
      loading={pending}
      onClick={async () => {
        setPending(true);
        await onClick();
        setPending(false);
      }}
    >
      {label}
    </Button>
  );
}

function CounterInline({ onSubmit }: { onSubmit: (amount: number) => Promise<boolean> }) {
  const [open, setOpen] = useState(false);
  if (!open) return <SmallAction label="Counter" onClick={async () => setOpen(true)} />;
  return <AmountForm label="Counter" compact onSubmit={async (a) => (await onSubmit(a)) && setOpen(false)} />;
}

function AmountForm({ label, onSubmit, placeholder, compact }: { label: string; onSubmit: (amount: number) => Promise<unknown>; placeholder?: string; compact?: boolean }) {
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  return (
    <form
      className="flex flex-wrap items-center gap-2"
      onSubmit={async (e) => {
        e.preventDefault();
        const amount = Number(value);
        if (!value || !Number.isInteger(amount) || amount < 1) {
          setError("Enter a whole-rupee amount.");
          return;
        }
        setError(null);
        setPending(true);
        await onSubmit(amount);
        setPending(false);
        setValue("");
      }}
    >
      <label className="sr-only" htmlFor={`amount-${label}`}>
        Amount in rupees
      </label>
      <div className="relative">
        <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted">₹</span>
        <input
          id={`amount-${label}`}
          inputMode="numeric"
          value={value}
          onChange={(e) => setValue(e.target.value.replace(/[^\d]/g, ""))}
          placeholder={placeholder ?? "Amount"}
          aria-invalid={!!error}
          className={`${compact ? "h-9 w-24" : "h-11 w-32"} rounded-xl border border-line bg-surface pr-2 pl-7 text-base outline-none focus:border-brand`}
        />
      </div>
      <Button type="submit" loading={pending} className={compact ? "h-9 px-3" : ""}>
        {label}
      </Button>
      {error && <span className="w-full text-xs text-danger">{error}</span>}
    </form>
  );
}

function Composer({ conversationId, onSent }: { conversationId: string; onSent: (m: Msg) => void }) {
  const toast = useToast();
  const [body, setBody] = useState("");
  const [pending, setPending] = useState(false);

  async function send() {
    const text = body.trim();
    if (!text || pending) return;
    setPending(true);
    const res = await api<Msg>(`/api/conversations/${conversationId}/messages`, { body: { body: text } });
    setPending(false);
    if (!res.ok) {
      toast(res.message, "error");
      return;
    }
    setBody("");
    onSent(res.data);
  }

  return (
    <form
      className="mt-3 flex items-end gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        void send();
      }}
    >
      <label htmlFor="composer" className="sr-only">
        Message
      </label>
      <textarea
        id="composer"
        rows={1}
        value={body}
        maxLength={2000}
        onChange={(e) => setBody(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            void send();
          }
        }}
        placeholder="Write a message…"
        className="max-h-32 min-h-11 flex-1 resize-none rounded-xl border border-line bg-surface px-3.5 py-2.5 text-base outline-none focus:border-brand"
      />
      <Button type="submit" loading={pending} disabled={!body.trim()}>
        Send
      </Button>
    </form>
  );
}
