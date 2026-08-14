"use client";

import { useRef } from "react";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import IconButton from "@mui/material/IconButton";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import { PRODUCT_THEME as T } from "./theme";
import { BuySellImage } from "@/components/common/BuySellImage";

export interface RelatedProduct {
  id: string;
  title: string;
  price: number;
  image?: string;
  href: string;
}

/**
 * Presentational-only carousel. Renders nothing if `products` is empty —
 * wire a real "similar products" API call in the parent page and pass the
 * results in; this component does not fetch or invent data itself.
 */
export function RelatedProductsCarousel({ products }: { products: RelatedProduct[] }) {
  const scrollerRef = useRef<HTMLDivElement>(null);

  if (!products || products.length === 0) return null;

  const scrollBy = (dir: 1 | -1) => {
    scrollerRef.current?.scrollBy({ left: dir * 280, behavior: "smooth" });
  };

  return (
    <Box>
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 1.5 }}>
        <Typography sx={{ fontFamily: T.font.display, fontWeight: 700, fontSize: 16, color: T.color.textPrimary }}>
          Similar listings
        </Typography>
        <Box sx={{ display: "flex", gap: 0.5 }}>
          <IconButton size="small" onClick={() => scrollBy(-1)} sx={{ border: `1px solid ${T.color.border}` }}>
            <ChevronLeftIcon fontSize="small" />
          </IconButton>
          <IconButton size="small" onClick={() => scrollBy(1)} sx={{ border: `1px solid ${T.color.border}` }}>
            <ChevronRightIcon fontSize="small" />
          </IconButton>
        </Box>
      </Box>

      <Box
        ref={scrollerRef}
        sx={{
          display: "flex",
          gap: 1.5,
          overflowX: "auto",
          scrollSnapType: "x mandatory",
          pb: 1,
          "&::-webkit-scrollbar": { height: 6 },
          "&::-webkit-scrollbar-thumb": { bgcolor: T.color.borderStrong, borderRadius: 4 },
        }}
      >
        {products.map((p) => (
          <Box
            key={p.id}
            component="a"
            href={p.href}
            sx={{
              flex: "0 0 220px",
              scrollSnapAlign: "start",
              textDecoration: "none",
              bgcolor: T.color.surface,
              border: `1px solid ${T.color.border}`,
              borderRadius: T.radius.md,
              overflow: "hidden",
              transition: "box-shadow 0.2s ease, transform 0.2s ease",
              "&:hover": { boxShadow: T.shadow.cardHover, transform: "translateY(-2px)" },
            }}
          >
            <BuySellImage
              src={p.image}
              alt={p.title}
              style={{ width: "100%", height: 140, objectFit: "cover", display: "block" }}
            />
            <Box sx={{ p: 1.25 }}>
              <Typography
                sx={{
                  fontFamily: T.font.body,
                  fontSize: 13,
                  color: T.color.textPrimary,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {p.title}
              </Typography>
              <Typography sx={{ fontFamily: T.font.display, fontSize: 15, fontWeight: 700, color: T.color.textPrimary, mt: 0.25 }}>
                ₹{p.price.toLocaleString("en-IN")}
              </Typography>
            </Box>
          </Box>
        ))}
      </Box>
    </Box>
  );
}
