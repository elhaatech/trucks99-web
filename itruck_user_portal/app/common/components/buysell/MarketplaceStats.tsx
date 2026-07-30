"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import { alpha } from "@mui/material/styles";
import NorthEastIcon from "@mui/icons-material/NorthEast";
import { PRODUCT_THEME as T, DASHBOARD_ACCENTS, INFO, LAYOUT, PRIMARY, SHADOW } from "@/lib/theme";
import { HERO_TRUCK_IMAGES } from "@/lib/heroTruckImages";
import { userProductRoutes } from "@/lib/userProductRoutes";
import type { MarketplaceStats } from "./utils";

type MarketplaceStatsProps = {
  stats: MarketplaceStats;
  /** Compact seller summary — not a second full card row */
  mySell?: MarketplaceStats | null;
  updatedAt?: Date | string | null;
  onViewMyListings?: () => void;
};

function pct(part: number, total: number): number {
  if (!total || total <= 0) return 0;
  return Math.min(100, Math.round((part / total) * 1000) / 10);
}

function formatUpdatedAt(value?: Date | string | null): string {
  if (!value) return "Just now";
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return "Just now";
  return d.toLocaleTimeString("en-IN", {
    hour: "numeric",
    minute: "2-digit",
  });
}

function CompositionBar({
  value,
  color,
  label,
}: {
  value: number;
  color: string;
  label: string;
}) {
  return (
    <Box sx={{ mt: 1.25 }}>
      <Box
        sx={{
          height: 4,
          borderRadius: 99,
          bgcolor: alpha(color, 0.12),
          overflow: "hidden",
        }}
      >
        <Box
          sx={{
            width: `${Math.max(2, value)}%`,
            height: "100%",
            bgcolor: color,
            borderRadius: 99,
            transition: "width 280ms ease",
          }}
        />
      </Box>
      <Typography
        sx={{
          mt: 0.6,
          fontSize: 11,
          fontWeight: 500,
          color: T.color.textMuted,
          letterSpacing: "0.01em",
        }}
      >
        {label}
      </Typography>
    </Box>
  );
}

type StatCardProps = {
  label: string;
  value: number;
  accent: (typeof DASHBOARD_ACCENTS)[keyof typeof DASHBOARD_ACCENTS];
  emphasis: "primary" | "secondary";
  composition?: { value: number; label: string };
};

function StatCard({ label, value, accent, emphasis, composition }: StatCardProps) {
  const primary = emphasis === "primary";

  return (
    <Box
      sx={{
        p: primary ? { xs: 1.75, md: 2 } : { xs: 1.5, md: 1.75 },
        borderRadius: T.radius.lg,
        border: `1px solid ${T.color.border}`,
        bgcolor: primary ? T.color.surface : T.color.surfaceMuted,
        boxShadow: primary ? T.shadow.card : "none",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        minHeight: primary ? { xs: 118, md: 132 } : { xs: 96, md: 104 },
        transition: "box-shadow 200ms ease, border-color 200ms ease",
        "&:hover": {
          borderColor: alpha(accent.main, 0.35),
          boxShadow: primary ? T.shadow.cardHover : SHADOW.sm,
        },
      }}
    >
      <Typography
        sx={{
          fontSize: primary ? 11 : 10.5,
          fontWeight: 600,
          letterSpacing: "0.06em",
          textTransform: "uppercase",
          color: T.color.textMuted,
          lineHeight: 1.2,
        }}
      >
        {label}
      </Typography>

      <Typography
        sx={{
          mt: primary ? 1.25 : 0.85,
          fontSize: primary ? { xs: 28, md: 34 } : { xs: 22, md: 24 },
          fontWeight: 800,
          color: primary ? accent.text : T.color.textPrimary,
          letterSpacing: "-0.03em",
          lineHeight: 1,
        }}
      >
        {value.toLocaleString("en-IN")}
      </Typography>

      {composition ? (
        <CompositionBar
          value={composition.value}
          color={accent.main}
          label={composition.label}
        />
      ) : (
        <Box sx={{ mt: 1, height: 20 }} />
      )}
    </Box>
  );
}

function MySellActivityStrip({
  stats,
  onViewMyListings,
}: {
  stats: MarketplaceStats;
  onViewMyListings?: () => void;
}) {
  const items = [
    { label: "Listings", value: stats.totalListings },
    { label: "Active", value: stats.activeListings },
    { label: "Sold", value: stats.soldVehicles },
    { label: "Offers", value: stats.totalOffers },
  ];

  return (
    <Box
      sx={{
        mt: 2,
        px: { xs: 1.75, md: 2 },
        py: { xs: 1.5, md: 1.65 },
        borderRadius: T.radius.lg,
        border: `1px solid ${T.color.border}`,
        bgcolor: alpha(PRIMARY, 0.04),
        display: "flex",
        flexWrap: "wrap",
        alignItems: "center",
        gap: { xs: 1.25, md: 2 },
      }}
    >
      <Typography
        sx={{
          fontSize: 12,
          fontWeight: 700,
          color: T.color.textSecondary,
          letterSpacing: "0.04em",
          textTransform: "uppercase",
          mr: { md: 0.5 },
          flexShrink: 0,
        }}
      >
        Your sell activity
      </Typography>

      <Box
        sx={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          gap: { xs: 1.25, sm: 2 },
          flex: 1,
          minWidth: 0,
        }}
      >
        {items.map((item, i) => (
          <Box
            key={item.label}
            sx={{
              display: "flex",
              alignItems: "baseline",
              gap: 0.6,
              ...(i > 0
                ? {
                    pl: { sm: 2 },
                    borderLeft: { sm: `1px solid ${T.color.border}` },
                  }
                : {}),
            }}
          >
            <Typography
              sx={{
                fontWeight: 800,
                fontSize: 16,
                color: T.color.textPrimary,
                letterSpacing: "-0.02em",
                lineHeight: 1,
              }}
            >
              {item.value.toLocaleString("en-IN")}
            </Typography>
            <Typography sx={{ fontSize: 12, color: T.color.textMuted, fontWeight: 500 }}>
              {item.label}
            </Typography>
          </Box>
        ))}
      </Box>

      <Button
        size="small"
        endIcon={<NorthEastIcon sx={{ fontSize: "14px !important" }} />}
        onClick={onViewMyListings}
        href={onViewMyListings ? undefined : userProductRoutes.sellVehicle()}
        sx={{
          textTransform: "none",
          fontWeight: 700,
          fontSize: 12.5,
          color: PRIMARY,
          ml: { xs: 0, md: "auto" },
          px: 1,
          minWidth: "auto",
        }}
      >
        My listings
      </Button>
    </Box>
  );
}

/** Marketplace overview with primary/secondary hierarchy + optional sell strip. */
export function MarketplaceStatsCards({
  stats,
  mySell,
  updatedAt,
  onViewMyListings,
}: MarketplaceStatsProps) {
  const activeShare = pct(stats.activeListings, stats.totalListings);
  const soldShare = pct(stats.soldVehicles, stats.totalListings);
  const offersPerListing =
    stats.totalListings > 0
      ? Math.round((stats.totalOffers / stats.totalListings) * 10) / 10
      : 0;

  return (
    <Box>
      <Box
        sx={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "flex-end",
          justifyContent: "space-between",
          gap: 1,
          mb: 0.5,
        }}
      >
        <Typography
          sx={{
            fontWeight: 800,
            fontSize: { xs: 18, md: 20 },
            color: T.color.textPrimary,
            letterSpacing: "-0.02em",
          }}
        >
          Marketplace overview
        </Typography>
        <Typography
          sx={{
            fontSize: 12,
            fontWeight: 500,
            color: T.color.textMuted,
          }}
        >
          Last updated {formatUpdatedAt(updatedAt)}
        </Typography>
      </Box>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2, fontSize: 13.5 }}>
        Live inventory signals across the TRUCKS99 marketplace.
      </Typography>

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: {
            xs: "1fr 1fr",
            md: "repeat(12, 1fr)",
          },
          gap: 1.5,
        }}
      >
        <Box sx={{ gridColumn: { xs: "span 2", sm: "span 1", md: "span 4" } }}>
          <StatCard
            label="Total listings"
            value={stats.totalListings}
            accent={DASHBOARD_ACCENTS.blue}
            emphasis="primary"
            composition={{
              value: activeShare,
              label: `${activeShare}% currently active`,
            }}
          />
        </Box>
        <Box sx={{ gridColumn: { xs: "span 2", sm: "span 1", md: "span 4" } }}>
          <StatCard
            label="Active listings"
            value={stats.activeListings}
            accent={DASHBOARD_ACCENTS.green}
            emphasis="primary"
            composition={{
              value: activeShare,
              label:
                stats.totalListings > 0
                  ? `${stats.activeListings.toLocaleString("en-IN")} of ${stats.totalListings.toLocaleString("en-IN")} total`
                  : "No listings yet",
            }}
          />
        </Box>
        <Box sx={{ gridColumn: { xs: "span 1", md: "span 2" } }}>
          <StatCard
            label="Sold"
            value={stats.soldVehicles}
            accent={DASHBOARD_ACCENTS.purple}
            emphasis="secondary"
            composition={{
              value: soldShare,
              label: `${soldShare}% of inventory`,
            }}
          />
        </Box>
        <Box sx={{ gridColumn: { xs: "span 1", md: "span 2" } }}>
          <StatCard
            label="Offers"
            value={stats.totalOffers}
            accent={DASHBOARD_ACCENTS.amber}
            emphasis="secondary"
            composition={{
              value: Math.min(100, offersPerListing * 20),
              label:
                stats.totalListings > 0
                  ? `~${offersPerListing} per listing`
                  : "No offers yet",
            }}
          />
        </Box>
      </Box>

      {mySell ? (
        <MySellActivityStrip stats={mySell} onViewMyListings={onViewMyListings} />
      ) : null}
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
              // Bleed to shell edges so hero sits flush under the sticky header
              mx: {
                xs: -LAYOUT.pageGutterX.xs,
                sm: -LAYOUT.pageGutterX.sm,
                md: -LAYOUT.pageGutterX.md,
              },
              width: {
                xs: `calc(100% + ${LAYOUT.pageGutterX.xs * 2 * 8}px)`,
                sm: `calc(100% + ${LAYOUT.pageGutterX.sm * 2 * 8}px)`,
                md: `calc(100% + ${LAYOUT.pageGutterX.md * 2 * 8}px)`,
              },
              borderTopLeftRadius: 0,
              borderTopRightRadius: 0,
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
