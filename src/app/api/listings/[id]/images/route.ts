import { NextResponse } from "next/server";
import { withErrorHandling, readJson } from "@/lib/errors";
import { requireVerifiedUser } from "@/lib/authz";
import { attachImageSchema } from "@/lib/validation/listing";
import { attachImage } from "@/lib/services/images";

// Called by the browser right after a successful Blob upload. Upload-completed
// webhooks can't reach localhost, so attaching is an explicit, verified step.
export const POST = withErrorHandling<RouteContext<"/api/listings/[id]/images">>(async (req, ctx) => {
  const user = await requireVerifiedUser();
  const { id } = await ctx.params;
  const { url, pathname } = attachImageSchema.parse(await readJson(req));
  const image = await attachImage(user.id, id, url, pathname);
  return NextResponse.json(image, { status: 201 });
});
