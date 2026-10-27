import { NextResponse } from "next/server";
import { withErrorHandling } from "@/lib/errors";
import { requireVerifiedUser } from "@/lib/authz";
import { markRead } from "@/lib/services/conversations";

export const POST = withErrorHandling<RouteContext<"/api/conversations/[id]/read">>(async (_req, ctx) => {
  const user = await requireVerifiedUser();
  const { id } = await ctx.params;
  await markRead(user.id, id);
  return NextResponse.json({ ok: true });
});
