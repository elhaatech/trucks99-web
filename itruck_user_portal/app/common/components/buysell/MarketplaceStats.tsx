"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { PRODUCT_THEME as T, DASHBOARD_ACCENTS, INFO } from "@/lib/theme";
import { HERO_TRUCK_IMAGES } from "@/lib/heroTruckImages";
import type { MarketplaceStats } from "./utils";

type MarketplaceStatsProps = {
  stats: MarketplaceStats;
};

const STAT_CONFIG = [
  { key: "totalListings" as const, label: "Total Listings", accent: DASHBOARD_ACCENTS.blue },
  { key: "activeListings" as const, label: "Active Listings", accent: DASHBOARD_ACCENTS.green },
  { key: "soldVehicles" as const, label: "Sold Vehicles", accent: DASHBOARD_ACCENTS.purple },
  { key: "totalOffers" as const, label: "Total Offers", accent: DASHBOARD_ACCENTS.amber },
];

export function MarketplaceStatsCards({ stats }: MarketplaceStatsProps) {
  return (
    <Box
      sx={{
        display: "grid",
        gridTemplateColumns: { xs: "1fr 1fr", md: "repeat(4, 1fr)" },
        gap: 2,
      }}
    >
      {STAT_CONFIG.map(({ key, label, accent }) => (
        <Box
          key={key}
          sx={{
            p: 2.5,
            borderRadius: T.radius.lg,
            border: `1px solid ${T.color.border}`,
            bgcolor: T.color.surface,
            boxShadow: T.shadow.card,
          }}
        >
          <Typography
            sx={{
              fontSize: 12,
              fontWeight: 600,
              letterSpacing: "0.04em",
              textTransform: "uppercase",
              color: T.color.textMuted,
            }}
          >
            {label}
          </Typography>
          <Typography
            sx={{
              mt: 1,
              fontSize: 28,
              fontWeight: 800,
              color: accent.text,
            }}
          >
            {stats[key].toLocaleString("en-IN")}
          </Typography>
        </Box>
      ))}
    </Box>
  );
}

function HeroTruckBackground({
  activeIndex,
  onSelect,
}: {
  activeIndex: number;
  onSelect: (index: number) => void;
}) {
  return (
    <>
      <Box sx={{ position: "absolute", inset: 0, zIndex: 0 }}>
        {HERO_TRUCK_IMAGES.map((image, index) => (
          <Box
            key={image.src}
            sx={{
              position: "absolute",
              inset: 0,
              opacity: index === activeIndex ? 1 : 0,
              transition: "opacity 1.2s ease-in-out",
            }}
          >
            <Image
              src={image.src}
              alt={image.alt}
              fill
              priority={index === 0}
              sizes="100vw"
              style={{ objectFit: "cover", objectPosition: "center" }}
            />
          </Box>
        ))}
        <Box
          sx={{
            position: "absolute",
            inset: 0,
            background:
              "linear-gradient(105deg, rgba(15,23,42,0.82) 0%, rgba(15,23,42,0.55) 45%, rgba(29,78,216,0.45) 100%)",
          }}
        />
      </Box>

      <Box
        sx={{
          position: "absolute",
          bottom: { xs: 12, md: 16 },
          left: "50%",
          transform: "translateX(-50%)",
          zIndex: 2,
          display: "flex",
          gap: { xs: 0.75, md: 1 },
          px: 1,
          maxWidth: "100%",
          overflowX: "auto",
        }}
      >
        {HERO_TRUCK_IMAGES.map((image, index) => (
          <Box
            key={`thumb-${image.src}`}
            role="button"
            tabIndex={0}
            aria-label={`Show ${image.alt}`}
            onClick={() => onSelect(index)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onSelect(index);
              }
            }}
            sx={{
              position: "relative",
              width: { xs: 52, sm: 64, md: 72 },
              height: { xs: 36, sm: 44, md: 48 },
              flexShrink: 0,
              borderRadius: 1,
              overflow: "hidden",
              cursor: "pointer",
              border: index === activeIndex ? "2px solid #fff" : "2px solid rgba(255,255,255,0.35)",
              opacity: index === activeIndex ? 1 : 0.75,
              boxShadow: index === activeIndex ? "0 4px 14px rgba(0,0,0,0.35)" : "none",
              transition: "opacity 0.2s, border-color 0.2s, box-shadow 0.2s",
              "&:hover": { opacity: 1 },
            }}
          >
            <Image src={image.src} alt="" fill sizes="80px" style={{ objectFit: "cover" }} />
          </Box>
        ))}
      </Box>
    </>
  );
}

export function HeroSearchSection({
  search,
  categoryId,
  categories,
  onSearchChange,
  onCategoryChange,
  onSearch,
  fullBleed = true,
}: {
  search: string;
  categoryId: string;
  categories: Array<{ _id: string; category_name: string }>;
  onSearchChange: (v: string) => void;
  onCategoryChange: (v: string) => void;
  onSearch: () => void;
  fullBleed?: boolean;
}) {
  const [activeSlide, setActiveSlide] = useState(0);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setActiveSlide((prev) => (prev + 1) % HERO_TRUCK_IMAGES.length);
    }, 5500);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <Box
      sx={{
        position: "relative",
        borderRadius: fullBleed ? 0 : T.radius.lg,
        overflow: "hidden",
        minHeight: { xs: 340, md: 420 },
        display: "flex",
        alignItems: "center",
        mb: 4,
        ...(fullBleed
          ? {
              mx: { xs: -2, sm: -3, lg: -4 },
              width: { xs: "calc(100% + 32px)", sm: "calc(100% + 48px)", lg: "calc(100% + 64px)" },
            }
          : {}),
      }}
    >
      <HeroTruckBackground activeIndex={activeSlide} onSelect={setActiveSlide} />

      <Box
        sx={{
          position: "relative",
          zIndex: 1,
          width: "100%",
          maxWidth: 920,
          mx: "auto",
          px: { xs: 3, md: 5 },
          py: { xs: 5, md: 6 },
          pb: { xs: 7, md: 8 },
          textAlign: "center",
        }}
      >
        <Typography
          sx={{
            color: "#fff",
            fontWeight: 800,
            fontSize: { xs: 28, md: 40 },
            lineHeight: 1.15,
            mb: 1.5,
            letterSpacing: "-0.02em",
          }}
        >
          Buy &amp; Sell Commercial Vehicles
          <Box component="span" sx={{ display: "block", color: "rgba(255,255,255,0.92)" }}>
            At Best Price
          </Box>
        </Typography>
        <Typography sx={{ color: "rgba(255,255,255,0.85)", mb: 3.5, fontSize: 15, maxWidth: 560, mx: "auto" }}>
          Trucks, trailers, tippers, buses &amp; heavy equipment — browse thousands of listings on TRUCKS99
        </Typography>

        <Box
          component="form"
          onSubmit={(e) => {
            e.preventDefault();
            onSearch();
          }}
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "1fr", md: "1fr 220px auto" },
            gap: 1.5,
            bgcolor: "rgba(255,255,255,0.98)",
            p: 1.5,
            borderRadius: T.radius.lg,
            boxShadow: T.shadow.elevated,
            maxWidth: 760,
            mx: "auto",
          }}
        >
          <Box
            component="input"
            placeholder="Search vehicles…"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            sx={{
              border: `1px solid ${T.color.border}`,
              borderRadius: T.radius.md,
              px: 2,
              py: 1.35,
              fontSize: 14,
              outline: "none",
              "&:focus": { borderColor: INFO },
            }}
          />
          <Box
            component="select"
            value={categoryId}
            onChange={(e) => onCategoryChange(e.target.value)}
            sx={{
              border: `1px solid ${T.color.border}`,
              borderRadius: T.radius.md,
              px: 2,
              py: 1.35,
              fontSize: 14,
              bgcolor: "#fff",
            }}
          >
            <option value="">All Categories</option>
            {categories.map((c) => (
              <option key={c._id} value={c._id}>
                {c.category_name}
              </option>
            ))}
          </Box>
          <Box
            component="button"
            type="submit"
            sx={{
              border: "none",
              borderRadius: T.radius.md,
              bgcolor: INFO,
              color: "#fff",
              fontWeight: 700,
              fontSize: 14,
              px: 3,
              py: 1.35,
              cursor: "pointer",
              "&:hover": { bgcolor: "#1d4ed8" },
            }}
          >
            Search
          </Box>
        </Box>
      </Box>
    </Box>
  );
}
