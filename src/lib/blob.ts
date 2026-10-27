import "server-only";
import { del, head } from "@vercel/blob";

// Auth: on Vercel and locally (via `vercel env pull`) the SDK uses VERCEL_OIDC_TOKEN + BLOB_STORE_ID.

export async function deleteBlobs(urls: string[]) {
  if (!urls.length) return;
  try {
    await del(urls);
  } catch (err) {
    // An orphaned blob is not worth failing the user's action over; log for cleanup.
    console.error("[blob] failed to delete", urls, err);
  }
}

export async function inspectBlob(url: string) {
  try {
    return await head(url);
  } catch {
    return null;
  }
}
