"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { uploadPresigned } from "@vercel/blob/client";
import { api } from "@/lib/api-client";
import { compressImage, validateImageFile } from "@/lib/image";
import { MAX_IMAGES } from "@/lib/validation/listing";
import { Button, Spinner } from "./ui";
import { useToast } from "./toaster";

type Saved = { id: string; url: string };
type Pending = {
  key: string;
  file: File;
  preview: string;
  stage: "compressing" | "uploading" | "saving" | "error";
  progress: number;
  error?: string;
};

export function PhotoManager({ listingId, initial, published }: { listingId: string; initial: Saved[]; published: boolean }) {
  const router = useRouter();
  const toast = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const [saved, setSaved] = useState<Saved[]>(initial);
  const [pending, setPending] = useState<Pending[]>([]);
  const [removing, setRemoving] = useState<string | null>(null);

  const slotsLeft = MAX_IMAGES - saved.length - pending.length;

  function patch(key: string, update: Partial<Pending>) {
    setPending((list) => list.map((p) => (p.key === key ? { ...p, ...update } : p)));
  }

  async function process(item: Pending) {
    const { key, file } = item;
    try {
      patch(key, { stage: "compressing", progress: 0, error: undefined });
      const { blob, ext } = await compressImage(file);
      patch(key, { stage: "uploading" });
      const pathname = `listings/${listingId}/${crypto.randomUUID()}.${ext}`;
      const uploaded = await uploadPresigned(pathname, blob, {
        access: "public",
        handleUploadUrl: "/api/blob/upload",
        clientPayload: JSON.stringify({ listingId }),
        contentType: blob.type,
        onUploadProgress: ({ percentage }) => patch(key, { progress: Math.round(percentage) }),
      });
      patch(key, { stage: "saving", progress: 100 });
      const res = await api<Saved>(`/api/listings/${listingId}/images`, { body: { url: uploaded.url, pathname: uploaded.pathname } });
      if (!res.ok) throw new Error(res.message);
      setSaved((s) => [...s, res.data]);
      setPending((list) => list.filter((p) => p.key !== key));
      URL.revokeObjectURL(item.preview);
      router.refresh();
    } catch (err) {
      const message = err instanceof Error && err.message ? friendly(err.message) : "Upload failed. Check your connection and retry.";
      patch(key, { stage: "error", error: message });
    }
  }

  function onPick(files: FileList | null) {
    if (!files?.length) return;
    const chosen = Array.from(files);
    if (chosen.length > slotsLeft) toast(`You can add ${slotsLeft} more photo${slotsLeft === 1 ? "" : "s"} (max ${MAX_IMAGES}).`, "error");
    const items: Pending[] = [];
    for (const file of chosen.slice(0, Math.max(0, slotsLeft))) {
      const problem = validateImageFile(file);
      if (problem) {
        toast(`${file.name}: ${problem}`, "error");
        continue;
      }
      items.push({ key: crypto.randomUUID(), file, preview: URL.createObjectURL(file), stage: "compressing", progress: 0 });
    }
    setPending((list) => [...list, ...items]);
    items.forEach(process);
    if (inputRef.current) inputRef.current.value = "";
  }

  async function remove(image: Saved) {
    setRemoving(image.id);
    const res = await api(`/api/listings/${listingId}/images/${image.id}`, { method: "DELETE" });
    setRemoving(null);
    if (!res.ok) {
      toast(res.message, "error");
      return;
    }
    setSaved((s) => s.filter((i) => i.id !== image.id));
    router.refresh();
  }

  return (
    <div>
      <ul className="grid grid-cols-3 gap-3 sm:grid-cols-5">
        {saved.map((img, i) => (
          <li key={img.id} className="relative aspect-square overflow-hidden rounded-xl border border-line bg-surface-2">
            <Image src={img.url} alt={`Photo ${i + 1}`} fill sizes="200px" className="object-cover" />
            {i === 0 && <span className="absolute top-1.5 left-1.5 rounded-md bg-ink/75 px-1.5 py-0.5 text-[10px] font-semibold text-bg">Cover</span>}
            <button
              type="button"
              onClick={() => remove(img)}
              disabled={removing === img.id || (published && saved.length <= 1)}
              title={published && saved.length <= 1 ? "A published listing needs at least one photo" : "Remove photo"}
              aria-label={`Remove photo ${i + 1}`}
              className="absolute top-1.5 right-1.5 grid size-7 place-items-center rounded-full bg-ink/75 text-bg transition hover:bg-danger disabled:opacity-40"
            >
              {removing === img.id ? <Spinner /> : "×"}
            </button>
          </li>
        ))}

        {pending.map((p) => (
          <li key={p.key} className="relative aspect-square overflow-hidden rounded-xl border border-line bg-surface-2">
            {/* eslint-disable-next-line @next/next/no-img-element -- local object URL preview */}
            <img src={p.preview} alt="" className="size-full object-cover opacity-50" />
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 p-2 text-center text-xs font-semibold">
              {p.stage === "error" ? (
                <>
                  <span className="rounded bg-danger-soft px-1.5 py-0.5 text-danger">{p.error}</span>
                  <div className="flex gap-1">
                    <button type="button" onClick={() => process(p)} className="rounded-md bg-brand px-2 py-1 text-brand-ink">
                      Retry
                    </button>
                    <button
                      type="button"
                      onClick={() => setPending((l) => l.filter((x) => x.key !== p.key))}
                      className="rounded-md bg-surface px-2 py-1 text-ink"
                    >
                      Remove
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <Spinner />
                  <span>{p.stage === "compressing" ? "Compressing…" : p.stage === "saving" ? "Saving…" : `${p.progress}%`}</span>
                  {p.stage === "uploading" && (
                    <span className="h-1 w-3/4 overflow-hidden rounded-full bg-surface">
                      <span className="block h-full bg-brand transition-all" style={{ width: `${p.progress}%` }} />
                    </span>
                  )}
                </>
              )}
            </div>
          </li>
        ))}

        {slotsLeft > 0 && (
          <li>
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="flex aspect-square w-full flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-line text-sm font-semibold text-muted transition hover:border-brand hover:text-brand"
            >
              <span className="text-2xl">+</span>
              Add photo
            </button>
          </li>
        )}
      </ul>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple
        aria-label="Upload listing photos"
        tabIndex={-1}
        className="sr-only"
        onChange={(e) => onPick(e.target.files)}
      />
      <p className="mt-2 text-xs text-muted">
        {saved.length}/{MAX_IMAGES} photos · JPEG, PNG or WebP up to 5 MB · the first photo is the cover.
      </p>
      {pending.some((p) => p.stage === "error") && (
        <Button type="button" variant="secondary" className="mt-3" onClick={() => pending.filter((p) => p.stage === "error").forEach(process)}>
          Retry failed uploads
        </Button>
      )}
    </div>
  );
}

function friendly(message: string) {
  if (/network|fetch|failed to fetch/i.test(message)) return "Network error. Retry?";
  if (/content type|contentType/i.test(message)) return "File type not allowed.";
  if (/size|too large/i.test(message)) return "File too large (max 5 MB).";
  return message.length > 80 ? "Upload failed. Retry?" : message;
}
