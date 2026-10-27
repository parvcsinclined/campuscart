"use client";

import { useState } from "react";
import Image from "next/image";

export function Gallery({ images, title }: { images: { id: string; url: string }[]; title: string }) {
  const [active, setActive] = useState(0);
  if (!images.length) {
    return <div className="grid aspect-[4/3] place-items-center rounded-2xl border border-line bg-surface-2 text-muted">No photos yet</div>;
  }
  const current = images[Math.min(active, images.length - 1)];
  return (
    <div className="flex flex-col gap-3">
      <div className="relative aspect-[4/3] overflow-hidden rounded-2xl border border-line bg-surface-2">
        <Image src={current.url} alt={`${title}, photo ${active + 1}`} fill priority sizes="(max-width: 1024px) 100vw, 60vw" className="object-contain" />
      </div>
      {images.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {images.map((img, i) => (
            <button
              key={img.id}
              type="button"
              onClick={() => setActive(i)}
              aria-label={`Show photo ${i + 1}`}
              aria-current={i === active}
              className="relative size-16 shrink-0 overflow-hidden rounded-lg border-2 border-transparent aria-[current=true]:border-brand"
            >
              <Image src={img.url} alt="" fill sizes="64px" className="object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
