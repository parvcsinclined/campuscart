import { NextResponse } from "next/server";
import { withErrorHandling, readJson } from "@/lib/errors";
import { requireVerifiedUser } from "@/lib/authz";
import { rateLimit } from "@/lib/rate-limit";
import { respondSchema } from "@/lib/validation/conversation";
import { respondToOffer } from "@/lib/services/offers";

export const POST = withErrorHandling<RouteContext<"/api/offers/[id]">>(async (req, ctx) => {
  const user = await requireVerifiedUser();
  const { id } = await ctx.params;
  await rateLimit(`offer:${user.id}`, 20, 60 * 60);
  const input = respondSchema.parse(await readJson(req));
  const result = await respondToOffer(user.id, id, input.action, input.action === "counter" ? input.amountInr : undefined);
  return NextResponse.json(result);
});
