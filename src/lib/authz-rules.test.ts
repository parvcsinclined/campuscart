import { describe, expect, it } from "vitest";
import { checkVerified, isConversationParticipant, isListingOwner, participantRole } from "./authz-rules";

describe("checkVerified", () => {
  it("rejects anonymous users", () => {
    expect(checkVerified(null)).toBe("unauthenticated");
  });
  it("rejects unverified users", () => {
    expect(checkVerified({ id: "u1", emailVerified: null })).toBe("not_verified");
  });
  it("accepts verified users", () => {
    expect(checkVerified({ id: "u1", emailVerified: new Date() })).toBe("ok");
  });
});

describe("isListingOwner", () => {
  it("is true only for the seller", () => {
    expect(isListingOwner("seller", { sellerId: "seller" })).toBe(true);
    expect(isListingOwner("buyer", { sellerId: "seller" })).toBe(false);
  });
});

describe("conversation participation", () => {
  const convo = { buyerId: "b", sellerId: "s" };
  it("allows buyer and seller", () => {
    expect(isConversationParticipant("b", convo)).toBe(true);
    expect(isConversationParticipant("s", convo)).toBe(true);
  });
  it("blocks everyone else", () => {
    expect(isConversationParticipant("x", convo)).toBe(false);
  });
  it("reports the role", () => {
    expect(participantRole("b", convo)).toBe("buyer");
    expect(participantRole("s", convo)).toBe("seller");
    expect(participantRole("x", convo)).toBeNull();
  });
});
