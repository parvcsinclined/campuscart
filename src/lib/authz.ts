import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { auth } from "./auth";
import { db } from "./db";
import { checkVerified, isConversationParticipant, isListingOwner } from "./authz-rules";
import { forbidden, notVerified, unauthenticated } from "./errors";

export type CurrentUser = { id: string; name: string; email: string; emailVerified: Date | null };

/**
 * Reads the session cookie, then re-reads the user from the DB so verification
 * status and deleted accounts are never trusted from a stale JWT. Memoised per request.
 */
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const session = await auth();
  const id = session?.user?.id;
  if (!id) return null;
  return db.user.findUnique({
    where: { id },
    select: { id: true, name: true, email: true, emailVerified: true },
  });
});

// ---- API route guards (throw AppError → mapped to 401/403 by withErrorHandling) ----

export async function requireUser(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) throw unauthenticated();
  return user;
}

export async function requireVerifiedUser(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  const result = checkVerified(user);
  if (result === "unauthenticated") throw unauthenticated();
  if (result === "not_verified") throw notVerified();
  return user!;
}

export function assertListingOwner(user: { id: string }, listing: { sellerId: string }) {
  if (!isListingOwner(user.id, listing)) throw forbidden("Only the seller can change this listing.");
}

export function assertParticipant(user: { id: string }, conversation: { buyerId: string; sellerId: string }) {
  if (!isConversationParticipant(user.id, conversation)) throw forbidden("You're not part of this conversation.");
}

// ---- Page guards (redirect instead of throwing) ----

export async function pageUser(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

export async function pageVerifiedUser(): Promise<CurrentUser> {
  const user = await pageUser();
  if (!user.emailVerified) redirect("/verify");
  return user;
}
