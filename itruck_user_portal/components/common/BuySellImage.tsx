"use client";

import type { ImgHTMLAttributes } from "react";
import {
  DEFAULT_VEHICLE_IMAGE,
  getBuySellImageUrl,
  handleBuySellImageError,
} from "@/lib/buysellUtils";

export type BuySellImageProps = Omit<
  ImgHTMLAttributes<HTMLImageElement>,
  "src"
> & {
  src?: string | null;
  /** Stretch the image to fill an absolutely-positioned parent. */
  fill?: boolean;
};

/**
 * Buy/Sell vehicle image with a guaranteed `/assets/dtruck.png` fallback
 * when the API path is missing, invalid, or fails to load.
 */
export function BuySellImage({
  src,
  alt = "Vehicle",
  fill = false,
  style,
  onError,
  ...rest
}: BuySellImageProps) {
  const resolved = getBuySellImageUrl(src) || DEFAULT_VEHICLE_IMAGE;

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      {...rest}
      src={resolved}
      alt={alt}
      onError={(event) => {
        handleBuySellImageError(event);
        onError?.(event);
      }}
      style={{
        objectFit: "cover",
        display: "block",
        ...(fill
          ? { position: "absolute", inset: 0, width: "100%", height: "100%" }
          : { width: "100%", height: "100%" }),
        ...style,
      }}
    />
  );
}
