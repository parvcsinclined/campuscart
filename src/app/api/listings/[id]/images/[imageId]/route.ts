import { NextResponse } from "next/server";
import { withErrorHandling } from "@/lib/errors";
import { requireVerifiedUser } from "@/lib/authz";
import { removeImage } from "@/lib/services/images";

export const DELETE = withErrorHandling<RouteContext<"/api/listings/[id]/images/[imageId]">>(async (_req, ctx) => {
  const user = await requireVerifiedUser();
  const { id, imageId } = await ctx.params;
  await removeImage(user.id, id, imageId);
  return NextResponse.json({ ok: true });
});
