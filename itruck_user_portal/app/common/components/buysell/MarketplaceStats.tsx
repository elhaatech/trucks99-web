"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import { alpha } from "@mui/material/styles";
import NorthEastIcon from "@mui/icons-material/NorthEast";
import {
  ArrowUpRight,
  CheckCircle2,
  Eye,
  ListChecks,
  Sparkles,
  Users,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { PRODUCT_THEME as T, DASHBOARD_ACCENTS, INFO, PRIMARY, SHADOW } from "@/lib/theme";
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

type AccentTone = (typeof DASHBOARD_ACCENTS)[keyof typeof DASHBOARD_ACCENTS];

type StatCardProps = {
  label: string;
  value: number;
  accent: AccentTone;
  description: string;
  subtitle?: string;
  trendText: string;
  progressValue: number;
  icon: LucideIcon;
};

function StatCard({
  label,
  value,
  accent,
  description,
  subtitle,
  trendText,
  progressValue,
  icon: Icon,
}: StatCardProps) {
  const resolvedProgress = Math.max(6, Math.min(100, progressValue));

  return (
    <Box
      sx={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        borderRadius: 2,
        border: `1px solid ${alpha(T.color.border, 0.8)}`,
        bgcolor: "#FFFFFF",
        boxShadow: SHADOW.card,
        p: { xs: 2.5, md: 3 },
        transition: "transform 220ms ease, box-shadow 220ms ease, border-color 220ms ease",
        transform: "translateY(0)",
        cursor: "default",
        "&:hover": {
          transform: "translateY(-4px)",
          boxShadow: SHADOW.cardHover,
          borderColor: alpha(accent.main, 0.26),
        },
      }}
    >
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 1.25 }}>
        <Box sx={{ minWidth: 0 }}>
          <Typography
            sx={{
              fontSize: { xs: 12, md: 13 },
              fontWeight: 700,
              letterSpacing: "0.16em",
              textTransform: "uppercase",
              color: T.color.textMuted,
              lineHeight: 1.2,
              mb: 0.5,
            }}
          >
            {label}
          </Typography>
          {subtitle ? (
            <Typography
              sx={{
                fontSize: 12.5,
                fontWeight: 500,
                color: T.color.textSecondary,
                lineHeight: 1.4,
              }}
            >
              {subtitle}
            </Typography>
          ) : null}
        </Box>
        <Box
          sx={{
            width: 30,
            height: 30,
            borderRadius: "14px",
            display: "grid",
            placeItems: "center",
            bgcolor: alpha(accent.main, 0.18),
            backgroundImage: `linear-gradient(135deg, ${alpha(accent.main, 0.18)} 0%, ${alpha(accent.main, 0.04)} 100%)`,
            color: accent.main,
            flexShrink: 0,
            boxShadow: `0 12px 24px ${alpha(accent.main, 0.08)}`,
          }}
        >
          <Icon size={24} strokeWidth={1.9} />
        </Box>
      </Box>

      <Typography
        sx={{
          mt: 2,
          fontSize: { xs: 32, sm: 36, md: 40 },
          fontWeight: 800,
          color: T.color.textPrimary,
          letterSpacing: "-0.04em",
          lineHeight: 1,
        }}
      >
        {value.toLocaleString("en-IN")}
      </Typography>

      <Typography
        sx={{
          mt: 1.1,
          fontSize: 13.5,
          fontWeight: 500,
          color: T.color.textSecondary,
          lineHeight: 1.55,
        }}
      >
        {description}
      </Typography>

      <Box sx={{ mt: "auto", pt: 2.5 }}>
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 1, mb: 1 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, color: accent.text }}>
            <ArrowUpRight size={15} strokeWidth={2} />
            <Typography
              sx={{
                fontSize: 12.5,
                fontWeight: 700,
                color: accent.text,
                lineHeight: 1,
                textTransform: "capitalize",
              }}
            >
              {trendText}
            </Typography>
          </Box>
          <Typography sx={{ fontSize: 12.5, fontWeight: 700, color: T.color.textMuted }}>
            {resolvedProgress}%
          </Typography>
        </Box>
        <Box
          sx={{
            height: 8,
            borderRadius: 99,
            bgcolor: alpha(accent.main, 0.12),
            overflow: "hidden",
          }}
        >
          <Box
            sx={{
              width: `${resolvedProgress}%`,
              height: "100%",
              bgcolor: accent.main,
              borderRadius: 99,
              transition: "width 260ms ease",
            }}
          />
        </Box>
      </Box>
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
   <></>
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

  const cards = useMemo(
    () => [
      {
        label: "Total listings",
        value: stats.totalListings,
        accent: DASHBOARD_ACCENTS.blue,
        description: "A complete view of inventory currently available in the marketplace.",
        subtitle: stats.newListingsInPeriod != null
          ? `${stats.newListingsInPeriod.toLocaleString("en-IN")} new in last 30 days`
          : "Live inventory breadth",
        trendText: `${activeShare}% active now`,
        progressValue: Math.max(14, Math.min(100, activeShare + 12)),
        icon: ListChecks,
      },
   
      {
        label: "Sold",
        value: stats.soldVehicles,
        accent: DASHBOARD_ACCENTS.purple,
        description: "Listings with approved (offer accepted) status.",
        subtitle: "Approved status",
        trendText: `${soldShare}% of inventory`,
        progressValue: soldShare,
        icon: CheckCircle2,
      },
      {
        label: "New users",
        value: stats.newUsersInPeriod ?? 0,
        accent: DASHBOARD_ACCENTS.amber,
        description: "New buyers and sellers who joined the marketplace in the last 30 days.",
        subtitle: "Recent signups",
        trendText:
          (stats.newUsersInPeriod ?? 0) > 0
            ? `${(stats.newUsersInPeriod ?? 0).toLocaleString("en-IN")} joined`
            : "No new users yet",
        progressValue:
          stats.totalUsers && stats.totalUsers > 0
            ? Math.min(100, Math.max(8, ((stats.newUsersInPeriod ?? 0) / stats.totalUsers) * 100))
            : (stats.newUsersInPeriod ?? 0) > 0
              ? 30
              : 0,
        icon: Users,
      },
      ...(stats.totalUsers != null
        ? [
            {
              label: "Total users",
              value: stats.totalUsers,
              accent: DASHBOARD_ACCENTS.teal,
              description: "Registered buyers and sellers on TRUCKS99.",
              subtitle: stats.newUsersInPeriod != null
                ? `${stats.newUsersInPeriod.toLocaleString("en-IN")} new in last 30 days`
                : "Registered accounts",
              trendText: "Marketplace community",
              progressValue: Math.min(100, Math.max(12, Math.round((stats.totalUsers / Math.max(stats.totalListings, 1)) * 8))),
              icon: Users,
            },
          ]
        : []),
    ],
    [activeShare, soldShare, stats],
  );

  return (
    <Box>
      <Box
        sx={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "flex-end",
          justifyContent: "space-between",
          gap: 1.5,
          mb: 1.25,
        }}
      >
        <Box>
          <Typography
            sx={{
              fontWeight: 800,
              fontSize: { xs: 24, md: 28 },
              color: T.color.textPrimary,
              letterSpacing: "-0.03em",
              lineHeight: 1.1,
            }}
          >
            Marketplace overview
          </Typography>
         
        </Box>
        <Box
          sx={{
            display: "inline-flex",
            alignItems: "center",
            gap: 0.75,
            px: 1.4,
            py: 0.8,
            borderRadius: 0,
            bgcolor: alpha(PRIMARY, 0.08),
            color: PRIMARY,
            fontSize: 12.5,
            fontWeight: 700,
          }}
        >
          <Eye size={16} strokeWidth={2} />
          Updated {formatUpdatedAt(updatedAt)}
        </Box>
      </Box>

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: {
            xs: "1fr",
            sm: "repeat(2, minmax(0, 1fr))",
            lg: "repeat(3, minmax(0, 1fr))",
            xl: stats.totalUsers != null
              ? "repeat(5, minmax(0, 1fr))"
              : "repeat(4, minmax(0, 1fr))",
          },
          alignItems: "stretch",
          gap: { xs: 1.5, md: 2 },
        }}
      >
        {cards.map((card) => (
          <Box key={card.label} sx={{ height: "100%", display: "flex", flexDirection: "column" }}>
            <StatCard {...card} />
          </Box>
        ))}
      </Box>

      {mySell ? (
        <MySellActivityStrip stats={mySell} onViewMyListings={onViewMyListings} />
      ) : null}
    </Box>
  );
}

/** Compact last-30-days totals for the vehicle list header. */
export function MarketplaceSummaryStrip({
  stats,
}: {
  stats: MarketplaceStats | null;
}) {
  if (!stats) return null;

  const items = [
    { label: "Products", value: stats.totalListings },
    { label: "Active", value: stats.activeListings },
    { label: "Sold", value: stats.soldVehicles },
    ...(stats.totalUsers != null ? [{ label: "Users", value: stats.totalUsers }] : []),
  ];

  return (
    <Box
      sx={{
        display: "flex",
        flexWrap: "wrap",
        alignItems: "center",
        gap: { xs: 1.25, sm: 2 },
        mb: 2,
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
                  borderLeft: { sm: `1px solid ${alpha(T.color.border, 0.8)}` },
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
          <Typography sx={{ fontSize: 12, color: T.color.textMuted, fontWeight: 600 }}>
            {item.label}
          </Typography>
        </Box>
      ))}
      {stats.newListingsInPeriod != null || stats.newUsersInPeriod != null ? (
        <Typography sx={{ fontSize: 12, color: T.color.textMuted, fontWeight: 500, ml: { sm: "auto" } }}>
          Last 30 days
          {stats.newListingsInPeriod != null
            ? ` · ${stats.newListingsInPeriod.toLocaleString("en-IN")} new listings`
            : ""}
          {stats.newUsersInPeriod != null
            ? ` · ${stats.newUsersInPeriod.toLocaleString("en-IN")} new users`
            : ""}
        </Typography>
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
              unoptimized
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
              borderRadius: 0,
              overflow: "hidden",
              cursor: "pointer",
              border: index === activeIndex ? "2px solid #fff" : "2px solid rgba(255,255,255,0.35)",
              opacity: index === activeIndex ? 1 : 0.75,
              boxShadow: index === activeIndex ? "0 4px 14px rgba(0,0,0,0.35)" : "none",
              transition: "opacity 0.2s, border-color 0.2s, box-shadow 0.2s",
              "&:hover": { opacity: 1 },
            }}
          >
            <Image src={image.src} alt="" fill sizes="80px" unoptimized style={{ objectFit: "cover" }} />
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
    const tick = () => {
      setActiveSlide((prev) => (prev + 1) % HERO_TRUCK_IMAGES.length);
    };
    const timer = window.setInterval(() => {
      if (typeof document !== "undefined" && document.visibilityState === "hidden") {
        return;
      }
      tick();
    }, 5500);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <Box
      sx={{
        position: "relative",
        borderRadius: 0,
        overflow: "hidden",
        minHeight: { xs: 340, md: 420 },
        display: "flex",
        alignItems: "center",
        mb: 4,
        ...(fullBleed
          ? {
              width: "100vw",
              position: "relative",
              left: "50%",
              right: "50%",
              marginLeft: "-50vw",
              marginRight: "-50vw",
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
            borderRadius: "16px",
            overflow: "hidden",
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
              borderRadius: 0,
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
              borderRadius: 0,
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
              borderRadius: "16px",
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
