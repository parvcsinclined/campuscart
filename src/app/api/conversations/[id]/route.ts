import { NextResponse } from "next/server";
import { withErrorHandling } from "@/lib/errors";
import { requireVerifiedUser } from "@/lib/authz";
import { getThread } from "@/lib/services/conversations";

// Polling endpoint: ?after=<ISO time> returns only newer messages plus current listing/offer state.
export const GET = withErrorHandling<RouteContext<"/api/conversations/[id]">>(async (req, ctx) => {
  const user = await requireVerifiedUser();
  const { id } = await ctx.params;
  const afterRaw = new URL(req.url).searchParams.get("after");
  const after = afterRaw && !Number.isNaN(Date.parse(afterRaw)) ? new Date(afterRaw) : undefined;
  return NextResponse.json(await getThread(user.id, id, after), { headers: { "Cache-Control": "no-store" } });
});
