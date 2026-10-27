import { NextResponse } from "next/server";
import { withErrorHandling, readJson } from "@/lib/errors";
import { requireVerifiedUser } from "@/lib/authz";
import { listingInputSchema } from "@/lib/validation/listing";
import { deleteListing, updateListing } from "@/lib/services/listings";

type Ctx = RouteContext<"/api/listings/[id]">;

export const PATCH = withErrorHandling<Ctx>(async (req, ctx) => {
  const user = await requireVerifiedUser();
  const { id } = await ctx.params;
  const input = listingInputSchema.parse(await readJson(req));
  await updateListing(user.id, id, input);
  return NextResponse.json({ ok: true });
});

export const DELETE = withErrorHandling<Ctx>(async (_req, ctx) => {
  const user = await requireVerifiedUser();
  const { id } = await ctx.params;
  await deleteListing(user.id, id);
  return NextResponse.json({ ok: true });
});
