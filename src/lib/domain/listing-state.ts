// The single source of truth for listing lifecycle rules. Pure: no DB, no I/O.
// Services execute a planned transition with a conditional atomic update.

export type ListingStatus = "AVAILABLE" | "RESERVED" | "SOLD" | "WITHDRAWN";
export type ListingAction = "reserve" | "cancel_reservation" | "back_out" | "expire" | "complete" | "withdraw" | "relist";
export type ActorRole = "seller" | "reserved_buyer" | "system" | "other";

export const RESERVATION_HOURS = 48;

type Rule = { from: ListingStatus[]; to: ListingStatus; actors: ActorRole[] };

export const TRANSITIONS: Record<ListingAction, Rule> = {
  reserve: { from: ["AVAILABLE"], to: "RESERVED", actors: ["seller"] },
  cancel_reservation: { from: ["RESERVED"], to: "AVAILABLE", actors: ["seller"] },
  back_out: { from: ["RESERVED"], to: "AVAILABLE", actors: ["reserved_buyer"] },
  expire: { from: ["RESERVED"], to: "AVAILABLE", actors: ["system"] },
  complete: { from: ["RESERVED"], to: "SOLD", actors: ["seller"] },
  withdraw: { from: ["AVAILABLE", "RESERVED"], to: "WITHDRAWN", actors: ["seller"] },
  relist: { from: ["WITHDRAWN"], to: "AVAILABLE", actors: ["seller"] },
};

export type TransitionPlan =
  | { ok: true; from: ListingStatus; to: ListingStatus }
  | { ok: false; error: "forbidden" | "invalid_state" | "not_published"; message: string };

const STATUS_WORD: Record<ListingStatus, string> = {
  AVAILABLE: "available",
  RESERVED: "reserved",
  SOLD: "sold",
  WITHDRAWN: "withdrawn",
};

export function actorRole(
  actorId: string | null,
  listing: { sellerId: string; reservedForId: string | null },
): ActorRole {
  if (actorId === null) return "system";
  if (actorId === listing.sellerId) return "seller";
  if (listing.reservedForId && actorId === listing.reservedForId) return "reserved_buyer";
  return "other";
}

export function planTransition(
  listing: { status: ListingStatus; publishedAt: Date | null; sellerId: string; reservedForId: string | null },
  action: ListingAction,
  actorId: string | null,
): TransitionPlan {
  const rule = TRANSITIONS[action];
  if (!listing.publishedAt) return { ok: false, error: "not_published", message: "Publish the listing first." };
  if (!rule.actors.includes(actorRole(actorId, listing))) {
    return { ok: false, error: "forbidden", message: "You're not allowed to do that on this listing." };
  }
  if (!rule.from.includes(listing.status)) {
    return {
      ok: false,
      error: "invalid_state",
      message:
        listing.status === "SOLD"
          ? "This item has already been sold."
          : `This item is ${STATUS_WORD[listing.status]}, so you can't do that right now.`,
    };
  }
  return { ok: true, from: listing.status, to: rule.to };
}

export function canEdit(status: ListingStatus) {
  return status !== "SOLD";
}

export function isReservationExpired(listing: { status: ListingStatus; reservedUntil: Date | null }, now = new Date()) {
  return listing.status === "RESERVED" && listing.reservedUntil !== null && listing.reservedUntil < now;
}

export function reservationDeadline(from = new Date()) {
  return new Date(from.getTime() + RESERVATION_HOURS * 60 * 60 * 1000);
}
