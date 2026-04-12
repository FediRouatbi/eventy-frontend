import type { ReactNode } from "react";
import { useEffect, useState } from "react";

import { cn } from "#/lib/utils";

type UrlImagePreviewProps = {
  url?: string | null;
  alt: string;
  variant?: "banner" | "poster" | "square";
  className?: string;
  imageClassName?: string;
  fallback?: ReactNode;
};

function getVariantClass(variant: UrlImagePreviewProps["variant"]) {
  switch (variant) {
    case "banner":
      return "aspect-[16/9]";
    case "poster":
      return "aspect-[2/3]";
    case "square":
      return "aspect-square";
    default:
      return "aspect-[16/9]";
  }
}

export function UrlImagePreview({
  url,
  alt,
  variant = "banner",
  className,
  imageClassName,
  fallback,
}: UrlImagePreviewProps) {
  const [failed, setFailed] = useState(false);
  const trimmedUrl = url?.trim() ?? "";
  const isValidUrl = /^https?:\/\//i.test(trimmedUrl);

  useEffect(() => {
    setFailed(false);
  }, [trimmedUrl]);

  const showImage = Boolean(trimmedUrl) && isValidUrl && !failed;
  if (!showImage && !fallback) {
    return null;
  }

  return (
    <div
      className={cn(
        "overflow-hidden rounded-[1.25rem] border border-border/70 bg-muted/20",
        getVariantClass(variant),
        className,
      )}
    >
      {showImage ? (
        <img
          key={trimmedUrl}
          src={trimmedUrl}
          alt={alt}
          className={cn("h-full w-full object-cover", imageClassName)}
          onError={() => setFailed(true)}
          loading="lazy"
        />
      ) : (
        fallback
      )}
    </div>
  );
}
