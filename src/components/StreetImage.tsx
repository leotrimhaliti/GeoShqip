"use client";

/* eslint-disable @next/next/no-img-element */

import type { ReactNode } from "react";

export function StreetImage(props: {
  src: string;
  overlay?: ReactNode;
  attribution: {
    mapillaryUrl: string;
    creatorUsername?: string;
  };
}) {
  const { src, overlay, attribution } = props;

  return (
    <div className="relative h-[100svh] w-full overflow-hidden bg-black touch-none">
      {/* Still image only (no panning/zooming). */}
      <img
        src={src}
        alt="Street view"
        className="absolute inset-0 h-full w-full object-cover"
        loading="eager"
        decoding="async"
        referrerPolicy="no-referrer"
      />

      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-black/60" />

      {overlay ? <div className="absolute inset-0">{overlay}</div> : null}

      {/* Attribution removed per user request */}
    </div>
  );
}
