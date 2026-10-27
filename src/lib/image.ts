// Browser-only: downscale and re-encode photos before upload so phone pictures
// become ~200-500 KB WebP files instead of multi-megabyte originals.

import { ALLOWED_IMAGE_TYPES, MAX_IMAGE_BYTES } from "./validation/listing";

const MAX_DIMENSION = 1600;

export function validateImageFile(file: File): string | null {
  if (!(ALLOWED_IMAGE_TYPES as readonly string[]).includes(file.type)) {
    return "Only JPEG, PNG or WebP photos are allowed.";
  }
  if (file.size > MAX_IMAGE_BYTES) {
    return `This photo is ${(file.size / 1024 / 1024).toFixed(1)} MB. The limit is 5 MB.`;
  }
  return null;
}

export async function compressImage(file: File): Promise<{ blob: Blob; ext: "webp" | "jpg" }> {
  const bitmap = await createImageBitmap(file).catch(() => {
    throw new Error("This file couldn't be read as an image.");
  });
  const scale = Math.min(1, MAX_DIMENSION / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Your browser couldn't process this photo.");
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();

  const toBlob = (type: string) =>
    new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, 0.82));
  const webp = await toBlob("image/webp");
  // Older Safari silently falls back to PNG for unsupported types.
  if (webp && webp.type === "image/webp") return { blob: webp, ext: "webp" };
  const jpeg = await toBlob("image/jpeg");
  if (!jpeg) throw new Error("Your browser couldn't compress this photo.");
  return { blob: jpeg, ext: "jpg" };
}
