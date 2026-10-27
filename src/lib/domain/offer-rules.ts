// Offer negotiation rules. Pure: no DB, no I/O.
//
// PENDING --accept (recipient)--> ACCEPTED   (reserves the listing at the amount)
// PENDING --reject (recipient)--> REJECTED
// PENDING --counter (recipient)-> COUNTERED  (+ a new PENDING offer from the recipient)
// PENDING --withdraw (proposer)-> WITHDRAWN
// PENDING --(listing leaves AVAILABLE)--> EXPIRED (system)

export type OfferStatus = "PENDING" | "ACCEPTED" | "REJECTED" | "COUNTERED" | "WITHDRAWN" | "EXPIRED";
export type OfferAction = "accept" | "reject" | "counter" | "withdraw";

export const MAX_OFFER_INR = 1_000_000;

export type RuleResult = { ok: true } | { ok: false; error: "forbidden" | "conflict" | "invalid"; message: string };

const ok: RuleResult = { ok: true };

export function canCreateOffer(input: {
  actorId: string;
  conversation: { buyerId: string; sellerId: string };
  listingStatus: string;
  hasPendingOffer: boolean;
  amount: number;
}): RuleResult {
  const { actorId, conversation, listingStatus, hasPendingOffer, amount } = input;
  if (actorId !== conversation.buyerId) {
    return actorId === conversation.sellerId
      ? { ok: false, error: "forbidden", message: "Sellers respond to offers. Use Counter to propose a price." }
      : { ok: false, error: "forbidden", message: "You're not part of this conversation." };
  }
  if (listingStatus !== "AVAILABLE") return { ok: false, error: "conflict", message: "Offers can only be made on available items." };
  if (hasPendingOffer) return { ok: false, error: "conflict", message: "There's already a pending offer. Wait for a response or withdraw it." };
  return validAmount(amount);
}

export function canRespond(input: {
  actorId: string;
  offer: { proposerId: string; status: OfferStatus };
  conversation: { buyerId: string; sellerId: string };
  action: OfferAction;
  listingStatus: string;
  counterAmount?: number;
}): RuleResult {
  const { actorId, offer, conversation, action, listingStatus } = input;
  const isParticipant = actorId === conversation.buyerId || actorId === conversation.sellerId;
  if (!isParticipant) return { ok: false, error: "forbidden", message: "You're not part of this conversation." };
  if (offer.status !== "PENDING") return { ok: false, error: "conflict", message: `This offer is already ${offer.status.toLowerCase()}.` };

  const isProposer = actorId === offer.proposerId;
  if (action === "withdraw") {
    return isProposer ? ok : { ok: false, error: "forbidden", message: "Only the person who made the offer can withdraw it." };
  }
  if (isProposer) return { ok: false, error: "forbidden", message: "You can't respond to your own offer." };
  if ((action === "accept" || action === "counter") && listingStatus !== "AVAILABLE") {
    return { ok: false, error: "conflict", message: "This item is no longer available." };
  }
  if (action === "counter") return validAmount(input.counterAmount);
  return ok;
}

export function nextStatus(action: OfferAction): OfferStatus {
  return { accept: "ACCEPTED", reject: "REJECTED", counter: "COUNTERED", withdraw: "WITHDRAWN" }[action] as OfferStatus;
}

function validAmount(amount: number | undefined): RuleResult {
  if (amount === undefined || !Number.isInteger(amount) || amount < 1 || amount > MAX_OFFER_INR) {
    return { ok: false, error: "invalid", message: "Enter a whole-rupee amount between ₹1 and ₹10,00,000." };
  }
  return ok;
}
