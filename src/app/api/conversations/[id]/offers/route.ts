import { NextResponse } from "next/server";
import { withErrorHandling, readJson } from "@/lib/errors";
import { requireVerifiedUser } from "@/lib/authz";
import { rateLimit } from "@/lib/rate-limit";
import { offerSchema } from "@/lib/validation/conversation";
import { createOffer } from "@/lib/services/offers";

export const POST = withErrorHandling<RouteContext<"/api/conversations/[id]/offers">>(async (req, ctx) => {
  const user = await requireVerifiedUser();
  const { id } = await ctx.params;
  await rateLimit(`offer:${user.id}`, 20, 60 * 60);
  const { amountInr } = offerSchema.parse(await readJson(req));
  return NextResponse.json(await createOffer(user.id, id, amountInr), { status: 201 });
});
