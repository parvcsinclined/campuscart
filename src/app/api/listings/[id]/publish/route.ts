import { NextResponse } from "next/server";
import { withErrorHandling } from "@/lib/errors";
import { requireVerifiedUser } from "@/lib/authz";
import { publishListing } from "@/lib/services/listings";

export const POST = withErrorHandling<RouteContext<"/api/listings/[id]/publish">>(async (_req, ctx) => {
  const user = await requireVerifiedUser();
  const { id } = await ctx.params;
  await publishListing(user.id, id);
  return NextResponse.json({ ok: true });
});
