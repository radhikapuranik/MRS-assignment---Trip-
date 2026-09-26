"use client";

import { useState } from "react";
import { loremFlickrUrl, picsumFallbackUrl } from "@/lib/images";

interface Props {
  keywords: (string | undefined)[];
  alt: string;
  className?: string;
}

export default function TripImage({ keywords, alt, className }: Props) {
  const primarySrc = loremFlickrUrl(...keywords);
  const fallbackSrc = picsumFallbackUrl(keywords.filter(Boolean).join("-") || alt);
  const [src, setSrc] = useState(primarySrc);

  return (
    // eslint-disable-next-line @next/next/no-img-element -- external, unconfigured hosts with an onError fallback chain
    <img
      src={src}
      alt={alt}
      loading="lazy"
      className={className}
      onError={() => {
        if (src !== fallbackSrc) setSrc(fallbackSrc);
      }}
    />
  );
}
