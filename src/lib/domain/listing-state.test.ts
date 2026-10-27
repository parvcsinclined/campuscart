import { describe, expect, it } from "vitest";
import { TRANSITIONS, actorRole, isReservationExpired, planTransition, type ListingAction, type ListingStatus } from "./listing-state";

const base = { publishedAt: new Date(), sellerId: "seller", reservedForId: null as string | null };
const listing = (status: ListingStatus, reservedForId: string | null = null) => ({ ...base, status, reservedForId });

describe("planTransition: allowed paths", () => {
  it.each<[ListingAction, ListingStatus, string | null, ListingStatus, string | null]>([
    ["reserve", "AVAILABLE", null, "RESERVED", "seller"],
    ["cancel_reservation", "RESERVED", "buyer", "AVAILABLE", "seller"],
    ["back_out", "RESERVED", "buyer", "AVAILABLE", "buyer"],
    ["expire", "RESERVED", "buyer", "AVAILABLE", null],
    ["complete", "RESERVED", "buyer", "SOLD", "seller"],
    ["withdraw", "AVAILABLE", null, "WITHDRAWN", "seller"],
    ["withdraw", "RESERVED", "buyer", "WITHDRAWN", "seller"],
    ["relist", "WITHDRAWN", null, "AVAILABLE", "seller"],
  ])("%s: %s -> %s", (action, from, reservedFor, to, actor) => {
    expect(planTransition(listing(from, reservedFor), action, actor)).toEqual({ ok: true, from, to });
  });
});

describe("planTransition: rejected paths", () => {
  it("SOLD is final for every action", () => {
    for (const action of Object.keys(TRANSITIONS) as ListingAction[]) {
      const actor = action === "expire" ? null : action === "back_out" ? "buyer" : "seller";
      const plan = planTransition(listing("SOLD", "buyer"), action, actor);
      expect(plan.ok).toBe(false);
    }
  });
  it("can't reserve an already reserved item (409-style invalid_state)", () => {
    expect(planTransition(listing("RESERVED", "b1"), "reserve", "seller")).toMatchObject({ ok: false, error: "invalid_state" });
  });
  it("can't complete a sale without a reservation", () => {
    expect(planTransition(listing("AVAILABLE"), "complete", "seller")).toMatchObject({ ok: false, error: "invalid_state" });
  });
  it("only the seller can reserve, complete, withdraw or relist", () => {
    for (const action of ["reserve", "complete", "withdraw", "relist"] as ListingAction[]) {
      expect(planTransition(listing("RESERVED", "buyer"), action, "buyer")).toMatchObject({ ok: false });
      expect(planTransition(listing("AVAILABLE"), action, "stranger")).toMatchObject({ ok: false, error: "forbidden" });
    }
  });
  it("only the reserved buyer can back out", () => {
    expect(planTransition(listing("RESERVED", "buyer"), "back_out", "other-buyer")).toMatchObject({ ok: false, error: "forbidden" });
    expect(planTransition(listing("RESERVED", "buyer"), "back_out", "seller")).toMatchObject({ ok: false, error: "forbidden" });
  });
  it("users can't trigger system expiry", () => {
    expect(planTransition(listing("RESERVED", "buyer"), "expire", "seller")).toMatchObject({ ok: false, error: "forbidden" });
  });
  it("drafts can't transition", () => {
    expect(planTransition({ ...listing("AVAILABLE"), publishedAt: null }, "reserve", "seller")).toMatchObject({ ok: false, error: "not_published" });
  });
});

describe("helpers", () => {
  it("actorRole", () => {
    expect(actorRole(null, base)).toBe("system");
    expect(actorRole("seller", base)).toBe("seller");
    expect(actorRole("b", { ...base, reservedForId: "b" })).toBe("reserved_buyer");
    expect(actorRole("x", base)).toBe("other");
  });
  it("isReservationExpired", () => {
    const now = new Date("2026-10-27T12:00:00Z");
    expect(isReservationExpired({ status: "RESERVED", reservedUntil: new Date("2026-10-27T11:59:00Z") }, now)).toBe(true);
    expect(isReservationExpired({ status: "RESERVED", reservedUntil: new Date("2026-10-27T12:01:00Z") }, now)).toBe(false);
    expect(isReservationExpired({ status: "AVAILABLE", reservedUntil: new Date("2026-10-26T00:00:00Z") }, now)).toBe(false);
  });
});
