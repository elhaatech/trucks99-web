"use client";

import { useMemo, useState } from "react";
import Box from "@mui/material/Box";
import IconButton from "@mui/material/IconButton";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import { getBuySellImageUrls, handleBuySellImageError } from "@/lib/buysellUtils";
import { PRODUCT_THEME as T } from "./theme";

interface ProductImageGalleryProps {
  images: string[];
  title?: string;
  /** Rendered as an overlay badge in the top-left corner, e.g. a status chip. */
  statusBadge?: React.ReactNode;
}

/**
 * Reusable image gallery: large hero image with next/prev navigation,
 * a scrollable thumbnail strip, an image counter, and cursor-tracked
 * zoom-on-hover (desktop only — disabled on touch devices).
 */
export function ProductImageGallery({ images, title, statusBadge }: ProductImageGalleryProps) {
  const safeImages = useMemo(() => getBuySellImageUrls(images), [images]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [isZooming, setIsZooming] = useState(false);
  const [zoomOrigin, setZoomOrigin] = useState("50% 50%");

  const hasMultiple = safeImages.length > 1;
  const currentIndex = Math.min(activeIndex, safeImages.length - 1);

  const goPrev = () =>
    setActiveIndex((i) => (i - 1 + safeImages.length) % safeImages.length);
  const goNext = () => setActiveIndex((i) => (i + 1) % safeImages.length);

  const handleMouseMove: React.MouseEventHandler<HTMLDivElement> = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setZoomOrigin(`${x}% ${y}%`);
  };

  return (
    <Box>
      {/* Hero image */}
      <Box
        onMouseEnter={() => setIsZooming(true)}
        onMouseLeave={() => setIsZooming(false)}
        onMouseMove={handleMouseMove}
        sx={{
          position: "relative",
          bgcolor: T.color.surfaceMuted,
          border: `1px solid ${T.color.border}`,
          borderRadius: T.radius.md,
          overflow: "hidden",
          aspectRatio: "4 / 3",
          cursor: "zoom-in",
          "@media (hover: none)": { cursor: "default" },
        }}
      >
        <Box
          component="img"
          src={safeImages[currentIndex]}
          alt={title ? `${title} — photo ${currentIndex + 1}` : `Product photo ${currentIndex + 1}`}
          sx={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            display: "block",
            transition: "transform 0.25s ease",
            transform: isZooming ? "scale(1.85)" : "scale(1)",
            transformOrigin: zoomOrigin,
            "@media (hover: none)": { transform: "none !important" },
          }}
          onError={handleBuySellImageError}
        />

        {statusBadge && (
          <Box sx={{ position: "absolute", top: 12, left: 12, zIndex: 2 }}>{statusBadge}</Box>
        )}

        {/* Image counter */}
        <Box
          sx={{
            position: "absolute",
            bottom: 12,
            right: 12,
            bgcolor: "rgba(17,24,39,0.72)",
            color: "#fff",
            fontFamily: T.font.body,
            fontSize: 12,
            fontWeight: 600,
            px: 1.25,
            py: 0.4,
            borderRadius: "999px",
          }}
        >
          {currentIndex + 1} / {safeImages.length}
        </Box>

        {/* Prev / next arrows */}
        {hasMultiple && (
          <>
            <IconButton
              onClick={goPrev}
              size="small"
              aria-label="Previous photo"
              sx={{
                position: "absolute",
                top: "50%",
                left: 10,
                transform: "translateY(-50%)",
                bgcolor: "rgba(255,255,255,0.9)",
                boxShadow: T.shadow.card,
                "&:hover": { bgcolor: "#fff" },
              }}
            >
              <ChevronLeftIcon fontSize="small" />
            </IconButton>
            <IconButton
              onClick={goNext}
              size="small"
              aria-label="Next photo"
              sx={{
                position: "absolute",
                top: "50%",
                right: 10,
                transform: "translateY(-50%)",
                bgcolor: "rgba(255,255,255,0.9)",
                boxShadow: T.shadow.card,
                "&:hover": { bgcolor: "#fff" },
              }}
            >
              <ChevronRightIcon fontSize="small" />
            </IconButton>
          </>
        )}
      </Box>

      {/* Thumbnails */}
      {hasMultiple && (
        <Box
          sx={{
            display: "flex",
            gap: 1,
            mt: 1.25,
            overflowX: "auto",
            pb: 0.5,
            "&::-webkit-scrollbar": { height: 6 },
            "&::-webkit-scrollbar-thumb": { bgcolor: T.color.borderStrong, borderRadius: 4 },
          }}
        >
          {safeImages.map((src, idx) => (
            <Box
              key={idx}
              component="img"
              src={src}
              alt={`Thumbnail ${idx + 1}`}
              onClick={() => setActiveIndex(idx)}
              sx={{
                width: 68,
                height: 52,
                objectFit: "cover",
                borderRadius: "6px",
                flexShrink: 0,
                cursor: "pointer",
                border: `2px solid ${idx === activeIndex ? T.color.accentGreen : T.color.border}`,
                opacity: idx === activeIndex ? 1 : 0.75,
                transition: "opacity 0.15s ease, border-color 0.15s ease, transform 0.15s ease",
                "&:hover": { opacity: 1, transform: "translateY(-1px)" },
              }}
              onError={handleBuySellImageError}
            />
          ))}
        </Box>
      )}
    </Box>
  );
}
