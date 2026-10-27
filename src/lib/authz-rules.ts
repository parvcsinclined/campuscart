// Pure ownership/participation rules, unit-tested in authz-rules.test.ts.
// Session-aware wrappers that throw AppErrors live in authz.ts.

export type SessionUser = { id: string; emailVerified: Date | null };

export type AuthzResult = "ok" | "unauthenticated" | "not_verified" | "forbidden";

export function checkVerified(user: SessionUser | null): AuthzResult {
  if (!user) return "unauthenticated";
  if (!user.emailVerified) return "not_verified";
  return "ok";
}

export function isListingOwner(userId: string, listing: { sellerId: string }): boolean {
  return listing.sellerId === userId;
}

export function isConversationParticipant(
  userId: string,
  conversation: { buyerId: string; sellerId: string },
): boolean {
  return conversation.buyerId === userId || conversation.sellerId === userId;
}

export function participantRole(
  userId: string,
  conversation: { buyerId: string; sellerId: string },
): "buyer" | "seller" | null {
  if (conversation.buyerId === userId) return "buyer";
  if (conversation.sellerId === userId) return "seller";
  return null;
}
