import { NextResponse } from "next/server";
import { withErrorHandling } from "@/lib/errors";
import { requireVerifiedUser } from "@/lib/authz";
import { rateLimit } from "@/lib/rate-limit";
import { openConversation } from "@/lib/services/conversations";

// 201 when a new inquiry is created, 200 when the existing one is returned.
export const POST = withErrorHandling<RouteContext<"/api/listings/[id]/conversations">>(async (_req, ctx) => {
  const user = await requireVerifiedUser();
  const { id } = await ctx.params;
  await rateLimit(`inquiry:${user.id}`, 30, 60 * 60);
  const convo = await openConversation(user.id, id);
  return NextResponse.json(convo, { status: convo.created ? 201 : 200 });
});
