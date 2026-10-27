import { NextResponse } from "next/server";
import { withErrorHandling, readJson } from "@/lib/errors";
import { requireVerifiedUser } from "@/lib/authz";
import { transitionSchema } from "@/lib/validation/conversation";
import { expireStaleReservations, transitionListing } from "@/lib/services/lifecycle";

export const POST = withErrorHandling<RouteContext<"/api/listings/[id]/transition">>(async (req, ctx) => {
  const user = await requireVerifiedUser();
  const { id } = await ctx.params;
  const { action, conversationId } = transitionSchema.parse(await readJson(req));
  await expireStaleReservations([id]);
  const result = await transitionListing({ listingId: id, action, actorId: user.id, conversationId });
  return NextResponse.json(result);
});
