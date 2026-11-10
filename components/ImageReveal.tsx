"use client";

import { useState } from "react";
import type { PersonImage } from "@/lib/types";

interface ImageRevealProps {
  image: PersonImage;
  category: string;
  /** When set, the round is over and the person's name is safe to show. */
  name?: string;
  revealed?: boolean;
}

function hasRealImage(image: PersonImage): boolean {
  return Boolean(
    image?.commonsFileUrl && !image.commonsFileUrl.startsWith("TODO")
  );
}

/**
 * Shows the secret person's photo (or a tasteful silhouette placeholder
 * before `npm run seed` has resolved a real licensed photo) plus the
 * category badge. After `revealed` is true, overlays the person's name.
 */
export default function ImageReveal({
  image,
  category,
  name,
  revealed,
}: ImageRevealProps) {
  const [imgError, setImgError] = useState(false);
  const showPlaceholder = !hasRealImage(image) || imgError;

  return (
    <div className="relative mx-auto aspect-square w-full max-w-sm overflow-hidden rounded-3xl border border-slate-800 bg-slate-900 shadow-xl">
      {showPlaceholder ? (
        <div className="flex h-full w-full flex-col items-center justify-center gap-3 bg-gradient-to-br from-slate-800 to-slate-950 text-slate-500">
          <span className="text-6xl" aria-hidden>
            🕵️
          </span>
          <span className="text-xs">Photo pending `npm run seed`</span>
        </div>
      ) : (
        // Using a plain <img> (not next/image) keeps this resilient to
        // whatever Commons file extension/dimensions the seed script
        // resolves, without needing per-domain size configuration.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={image.commonsFileUrl}
          alt={revealed && name ? name : `A mystery person from ${category}`}
          className="h-full w-full object-cover"
          onError={() => setImgError(true)}
        />
      )}

      <div className="absolute left-3 top-3 rounded-full bg-black/60 px-3 py-1 text-xs font-medium text-white backdrop-blur">
        {category}
      </div>

      {revealed && name && (
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 to-transparent p-4 pt-10 animate-fade-in">
          <p className="text-xl font-bold text-white">{name}</p>
          {!showPlaceholder && image.attribution && (
            <p className="mt-1 text-[10px] leading-tight text-slate-300/80">
              {image.attribution}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
