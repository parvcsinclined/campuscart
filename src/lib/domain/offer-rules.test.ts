import { describe, expect, it } from "vitest";
import { canCreateOffer, canRespond, nextStatus } from "./offer-rules";

const conversation = { buyerId: "buyer", sellerId: "seller" };

describe("canCreateOffer", () => {
  const base = { actorId: "buyer", conversation, listingStatus: "AVAILABLE", hasPendingOffer: false, amount: 500 };
  it("lets the buyer offer on an available item", () => {
    expect(canCreateOffer(base)).toEqual({ ok: true });
  });
  it("blocks sellers and strangers", () => {
    expect(canCreateOffer({ ...base, actorId: "seller" })).toMatchObject({ ok: false, error: "forbidden" });
    expect(canCreateOffer({ ...base, actorId: "x" })).toMatchObject({ ok: false, error: "forbidden" });
  });
  it("allows only one pending offer at a time", () => {
    expect(canCreateOffer({ ...base, hasPendingOffer: true })).toMatchObject({ ok: false, error: "conflict" });
  });
  it("requires an AVAILABLE listing", () => {
    for (const s of ["RESERVED", "SOLD", "WITHDRAWN"]) {
      expect(canCreateOffer({ ...base, listingStatus: s })).toMatchObject({ ok: false, error: "conflict" });
    }
  });
  it("validates the amount", () => {
    for (const amount of [0, -5, 10.5, 2_000_000]) {
      expect(canCreateOffer({ ...base, amount })).toMatchObject({ ok: false, error: "invalid" });
    }
  });
});

describe("canRespond", () => {
  const buyerOffer = { proposerId: "buyer", status: "PENDING" as const };
  const sellerCounter = { proposerId: "seller", status: "PENDING" as const };
  const base = { conversation, listingStatus: "AVAILABLE" };

  it("seller can accept, reject or counter the buyer's offer", () => {
    expect(canRespond({ ...base, actorId: "seller", offer: buyerOffer, action: "accept" })).toEqual({ ok: true });
    expect(canRespond({ ...base, actorId: "seller", offer: buyerOffer, action: "reject" })).toEqual({ ok: true });
    expect(canRespond({ ...base, actorId: "seller", offer: buyerOffer, action: "counter", counterAmount: 450 })).toEqual({ ok: true });
  });
  it("buyer can withdraw their own offer but not accept it", () => {
    expect(canRespond({ ...base, actorId: "buyer", offer: buyerOffer, action: "withdraw" })).toEqual({ ok: true });
    expect(canRespond({ ...base, actorId: "buyer", offer: buyerOffer, action: "accept" })).toMatchObject({ ok: false, error: "forbidden" });
  });
  it("buyer can accept a seller's counter; seller can withdraw it", () => {
    expect(canRespond({ ...base, actorId: "buyer", offer: sellerCounter, action: "accept" })).toEqual({ ok: true });
    expect(canRespond({ ...base, actorId: "seller", offer: sellerCounter, action: "withdraw" })).toEqual({ ok: true });
  });
  it("rejects responses to non-pending offers", () => {
    expect(canRespond({ ...base, actorId: "seller", offer: { ...buyerOffer, status: "EXPIRED" }, action: "accept" })).toMatchObject({
      ok: false,
      error: "conflict",
    });
  });
  it("can't accept or counter once the item is no longer available", () => {
    expect(canRespond({ ...base, listingStatus: "RESERVED", actorId: "seller", offer: buyerOffer, action: "accept" })).toMatchObject({
      ok: false,
      error: "conflict",
    });
  });
  it("blocks outsiders", () => {
    expect(canRespond({ ...base, actorId: "x", offer: buyerOffer, action: "reject" })).toMatchObject({ ok: false, error: "forbidden" });
  });
  it("maps actions to statuses", () => {
    expect([nextStatus("accept"), nextStatus("reject"), nextStatus("counter"), nextStatus("withdraw")]).toEqual([
      "ACCEPTED",
      "REJECTED",
      "COUNTERED",
      "WITHDRAWN",
    ]);
  });
});
