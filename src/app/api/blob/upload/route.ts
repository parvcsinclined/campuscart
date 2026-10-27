import { NextResponse } from "next/server";
import { issueSignedToken } from "@vercel/blob";
import { handleUploadPresigned, type HandleUploadPresignedBody } from "@vercel/blob/client";
import { withErrorHandling, readJson, badRequest } from "@/lib/errors";
import { requireVerifiedUser } from "@/lib/authz";
import { rateLimit } from "@/lib/rate-limit";
import { authorizeImageUpload } from "@/lib/services/images";
import { ALLOWED_IMAGE_TYPES, MAX_IMAGE_BYTES } from "@/lib/validation/listing";

/**
 * Issues a short-lived presigned upload URL for one listing photo.
 * Auth is OIDC (VERCEL_OIDC_TOKEN + BLOB_STORE_ID). The token is scoped to the
 * exact pathname, `put` only, and the allowed types/size, so the browser can't
 * upload anything else with it.
 */
export const POST = withErrorHandling(async (req) => {
  const user = await requireVerifiedUser();
  await rateLimit(`blob-upload:${user.id}`, 60, 60 * 60);
  const body = (await readJson(req)) as HandleUploadPresignedBody;

  const result = await handleUploadPresigned({
    body,
    request: req,
    getSignedToken: async (pathname, clientPayload) => {
      const listingId = parseListingId(clientPayload);
      await authorizeImageUpload(user.id, listingId, pathname);
      const constraints = {
        allowedContentTypes: [...ALLOWED_IMAGE_TYPES],
        maximumSizeInBytes: MAX_IMAGE_BYTES,
        validUntil: Date.now() + 10 * 60 * 1000,
      };
      const token = await issueSignedToken({ pathname, operations: ["put"], ...constraints });
      return { token, urlOptions: { ...constraints, addRandomSuffix: false, allowOverwrite: false } };
    },
  });
  return NextResponse.json(result);
});

function parseListingId(clientPayload: string | null): string {
  try {
    const { listingId } = JSON.parse(clientPayload ?? "{}");
    if (typeof listingId === "string" && /^[a-z0-9]{10,40}$/.test(listingId)) return listingId;
  } catch {}
  throw badRequest("Missing listing for this upload.");
}
