"use client";

import { useMemo, useState } from "react";
import Box from "@mui/material/Box";
import IconButton from "@mui/material/IconButton";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import ThreeSixtyOutlinedIcon from "@mui/icons-material/ThreeSixtyOutlined";
import { getBuySellImageUrls, handleBuySellImageError } from "@/lib/buysellUtils";
import { PRODUCT_THEME as T, INFO } from "@/lib/theme";

const MAX_VISIBLE_THUMBS = 5;

type ProductViewGalleryProps = {
  images: string[];
  title?: string;
};

export function ProductViewGallery({ images, title }: ProductViewGalleryProps) {
  const safeImages = useMemo(() => getBuySellImageUrls(images), [images]);
  const [index, setIndex] = useState(0);
  const hasMultiple = safeImages.length > 1;
  const thumbSlots = safeImages.slice(0, MAX_VISIBLE_THUMBS);
  const extraCount = Math.max(0, safeImages.length - MAX_VISIBLE_THUMBS);
  const activeIndex = Math.min(index, safeImages.length - 1);

  return (
    <Box sx={{ mb: 2.5 }}>
      <Box
        sx={{
          position: "relative",
          borderRadius: T.radius.lg,
          overflow: "hidden",
          bgcolor: T.color.surfaceMuted,
          aspectRatio: { xs: "16 / 10", md: "4 / 3" },
          border: `1px solid ${T.color.border}`,
        }}
      >
        <Box
          component="img"
          src={safeImages[activeIndex]}
          alt={title ? `${title} photo ${activeIndex + 1}` : "Vehicle photo"}
          onError={handleBuySellImageError}
          sx={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
        />
        {hasMultiple ? (
          <>
            <IconButton
              onClick={() => setIndex((i) => (i - 1 + safeImages.length) % safeImages.length)}
              sx={{
                position: "absolute",
                top: "50%",
                left: 8,
                transform: "translateY(-50%)",
                bgcolor: "rgba(255,255,255,0.92)",
                boxShadow: T.shadow.card,
              }}
              size="small"
              aria-label="Previous photo"
            >
              <ChevronLeftIcon />
            </IconButton>
            <IconButton
              onClick={() => setIndex((i) => (i + 1) % safeImages.length)}
              sx={{
                position: "absolute",
                top: "50%",
                right: 8,
                transform: "translateY(-50%)",
                bgcolor: "rgba(255,255,255,0.92)",
                boxShadow: T.shadow.card,
              }}
              size="small"
              aria-label="Next photo"
            >
              <ChevronRightIcon />
            </IconButton>
          </>
        ) : null}
        <IconButton
          size="small"
          aria-label="360 view"
          sx={{
            position: "absolute",
            bottom: 12,
            right: 12,
            bgcolor: "rgba(255,255,255,0.92)",
            boxShadow: T.shadow.card,
          }}
        >
          <ThreeSixtyOutlinedIcon fontSize="small" />
        </IconButton>
      </Box>

      {safeImages.length > 1 ? (
        <Box
          sx={{
            display: "flex",
            gap: 1,
            mt: 1.25,
            overflowX: "auto",
            pb: 0.25,
          }}
        >
          {thumbSlots.map((src, idx) => {
            const isOverflowSlot = idx === MAX_VISIBLE_THUMBS - 1 && extraCount > 0;
            const imageIndex = idx;
            const isActive = activeIndex === imageIndex;

            return (
              <Box
                key={`${src}-${idx}`}
                onClick={() => {
                  if (isOverflowSlot) setIndex(MAX_VISIBLE_THUMBS - 1);
                  else setIndex(imageIndex);
                }}
                sx={{
                  position: "relative",
                  width: 72,
                  height: 54,
                  flexShrink: 0,
                  borderRadius: 1,
                  overflow: "hidden",
                  cursor: "pointer",
                  border: `2px solid ${isActive ? INFO : T.color.border}`,
                  opacity: isActive ? 1 : 0.85,
                }}
              >
                <Box
                  component="img"
                  src={src}
                  alt={`Thumbnail ${idx + 1}`}
                  onError={handleBuySellImageError}
                  sx={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                />
                {isOverflowSlot ? (
                  <Box
                    sx={{
                      position: "absolute",
                      inset: 0,
                      bgcolor: "rgba(15,23,42,0.55)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "#fff",
                      fontWeight: 700,
                      fontSize: 14,
                    }}
                  >
                    +{extraCount}
                  </Box>
                ) : null}
              </Box>
            );
          })}
        </Box>
      ) : null}
    </Box>
  );
}
