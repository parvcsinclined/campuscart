import { NextResponse } from "next/server";
import { withErrorHandling, readJson } from "@/lib/errors";
import { requireVerifiedUser } from "@/lib/authz";
import { rateLimit } from "@/lib/rate-limit";
import { listingInputSchema } from "@/lib/validation/listing";
import { createDraftListing } from "@/lib/services/listings";

export const POST = withErrorHandling(async (req) => {
  const user = await requireVerifiedUser();
  await rateLimit(`listing-create:${user.id}`, 20, 60 * 60);
  const input = listingInputSchema.parse(await readJson(req));
  const listing = await createDraftListing(user.id, input);
  return NextResponse.json(listing, { status: 201 });
});
