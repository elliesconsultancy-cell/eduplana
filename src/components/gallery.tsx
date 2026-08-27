"use client";

import { AssetImage } from "@/components/asset-image";
import { ChevronLeft, ChevronRight, Maximize2, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import type { GalleryImage } from "@/lib/types";

/** Photo gallery with a lightbox. Keyboard-navigable, Escape closes. */
export function Gallery({ images, name }: { images: GalleryImage[]; name: string }) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const isOpen = openIndex !== null;

  const close = useCallback(() => setOpenIndex(null), []);
  const step = useCallback(
    (delta: number) =>
      setOpenIndex((current) =>
        current === null ? null : (current + delta + images.length) % images.length,
      ),
    [images.length],
  );

  useEffect(() => {
    if (!isOpen) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") close();
      if (event.key === "ArrowRight") step(1);
      if (event.key === "ArrowLeft") step(-1);
    }
    window.addEventListener("keydown", onKey);
    // Stop the page scrolling behind the lightbox.
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [isOpen, close, step]);

  const [lead, ...rest] = images;

  return (
    <>
      {/*
       * On desktop the whole mosaic is one 3:2 block: the lead photo fills the
       * left, and however many thumbnails there are share the right column's
       * height evenly. Fixing the height on the container rather than each
       * child keeps the two columns flush whether there are two photos or five.
       */}
      <div className="grid gap-2.5 sm:aspect-[3/2] sm:grid-cols-[2fr_1fr]">
        <button
          type="button"
          onClick={() => setOpenIndex(0)}
          className="group relative aspect-[4/3] overflow-hidden rounded-2xl bg-ink-100 sm:aspect-auto sm:h-full"
        >
          <AssetImage
            path={lead.full}
            alt={`${name} — photo 1`}
            fill
            sizes="(max-width: 640px) 100vw, 700px"
            priority
            className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
          />
          <span className="pointer-events-none absolute bottom-3 left-3 inline-flex items-center gap-1.5 rounded-full bg-white/90 px-3 py-1.5 text-xs font-bold text-ink-800 opacity-0 backdrop-blur transition-opacity group-hover:opacity-100">
            <Maximize2 size={13} strokeWidth={2.5} aria-hidden />
            View all {images.length}
          </span>
        </button>

        {rest.length > 0 ? (
          <div className="grid auto-rows-fr grid-cols-3 gap-2.5 sm:h-full sm:grid-cols-1">
            {rest.slice(0, 3).map((image, index) => (
              <button
                key={image.full}
                type="button"
                onClick={() => setOpenIndex(index + 1)}
                className="group relative aspect-[4/3] min-h-0 overflow-hidden rounded-2xl bg-ink-100 sm:aspect-auto"
              >
                <AssetImage
                  path={image.thumb}
                  alt={`${name} — photo ${index + 2}`}
                  fill
                  sizes="240px"
                  className="object-cover transition-transform duration-500 group-hover:scale-[1.05]"
                />
                {index === 2 && images.length > 4 ? (
                  <span className="absolute inset-0 grid place-items-center bg-ink-950/60 text-sm font-bold text-white backdrop-blur-[2px]">
                    +{images.length - 4} more
                  </span>
                ) : null}
              </button>
            ))}
          </div>
        ) : null}
      </div>

      {isOpen ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`${name} photographs`}
          className="fixed inset-0 z-50 flex items-center justify-center bg-ink-950/92 p-4"
          onClick={close}
        >
          <button
            type="button"
            onClick={close}
            aria-label="Close"
            className="absolute right-4 top-4 inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3.5 py-2 text-sm font-semibold text-white hover:bg-white/20"
          >
            <X size={15} strokeWidth={2.5} aria-hidden />
            Close
          </button>

          <div className="relative h-full w-full max-w-4xl" onClick={(e) => e.stopPropagation()}>
            <AssetImage
              path={images[openIndex].full}
              alt={`${name} — photo ${openIndex + 1}`}
              fill
              sizes="100vw"
              className="object-contain"
            />
          </div>

          {images.length > 1 ? (
            <>
              <LightboxNav side="left" onClick={() => step(-1)} />
              <LightboxNav side="right" onClick={() => step(1)} />
              <p className="absolute bottom-5 left-1/2 -translate-x-1/2 rounded-full bg-white/10 px-3 py-1 text-sm text-white tabular-nums">
                {openIndex + 1} / {images.length}
              </p>
            </>
          ) : null}
        </div>
      ) : null}
    </>
  );
}

function LightboxNav({ side, onClick }: { side: "left" | "right"; onClick: () => void }) {
  return (
    <button
      type="button"
      aria-label={side === "left" ? "Previous photo" : "Next photo"}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className={`absolute top-1/2 grid -translate-y-1/2 place-items-center rounded-full bg-white/10 p-3 text-white transition-colors hover:bg-white/25 ${
        side === "left" ? "left-3" : "right-3"
      }`}
    >
      {side === "left" ? (
        <ChevronLeft size={24} strokeWidth={2.4} aria-hidden />
      ) : (
        <ChevronRight size={24} strokeWidth={2.4} aria-hidden />
      )}
    </button>
  );
}
