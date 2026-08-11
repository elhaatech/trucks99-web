"use client";

import React from "react";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import LocalShippingOutlinedIcon from "@mui/icons-material/LocalShippingOutlined";
import AirportShuttleOutlinedIcon from "@mui/icons-material/AirportShuttleOutlined";
import AgricultureOutlinedIcon from "@mui/icons-material/AgricultureOutlined";
import DirectionsBusOutlinedIcon from "@mui/icons-material/DirectionsBusOutlined";
import BuildOutlinedIcon from "@mui/icons-material/BuildOutlined";
import TerrainOutlinedIcon from "@mui/icons-material/TerrainOutlined";
import ConstructionOutlinedIcon from "@mui/icons-material/ConstructionOutlined";
import TrafficOutlinedIcon from "@mui/icons-material/TrafficOutlined";
import AppsOutlinedIcon from "@mui/icons-material/AppsOutlined";
import { alpha } from "@mui/material/styles";
import { PRODUCT_THEME as T } from "@/lib/theme";
import type { Category } from "@/model/services/category";

type CategoryCardProps = {
  category: Category;
  onClick?: (categoryId: string) => void;
};

function getCategoryIcon(name: string) {
  const lower = (name || "").toLowerCase();
  if (lower.includes("tractor")) {
    return AgricultureOutlinedIcon;
  }
  if (lower.includes("bus") || lower.includes("van") || lower.includes("coach")) {
    return DirectionsBusOutlinedIcon;
  }
  if (lower.includes("const") || lower.includes("road") || lower.includes("mining")) {
    return ConstructionOutlinedIcon;
  }
  if (lower.includes("crane") || lower.includes("lift")) {
    return TrafficOutlinedIcon;
  }
  if (lower.includes("jcb") || lower.includes("excavator")) {
    return TerrainOutlinedIcon;
  }
  if (lower.includes("other")) {
    return AppsOutlinedIcon;
  }
  if (lower.includes("truck") || lower.includes("mini tr") || lower.includes("3 wheeler") || lower.includes("lorry") || lower.includes("vehicle")) {
    return AirportShuttleOutlinedIcon;
  }
  if (lower.includes("agri") || lower.includes("tool")) {
    return LocalShippingOutlinedIcon;
  }
  return BuildOutlinedIcon;
}

type PastelColorSet = {
  bg: string;
  color: string;
  hoverBg: string;
};

const PASTEL_COLORS: Record<string, PastelColorSet> = {
  tractor: { bg: "#FEF3C7", color: "#D97706", hoverBg: "#FDE68A" },
  bus: { bg: "#EDE9FE", color: "#7C3AED", hoverBg: "#DDD6FE" },
  constrn: { bg: "#FFE4E6", color: "#E11D48", hoverBg: "#FECDD3" },
  crane: { bg: "#CFFAFE", color: "#0891B2", hoverBg: "#A5F3FC" },
  excavator: { bg: "#DCFCE7", color: "#16A34A", hoverBg: "#BBF7D0" },
  other: { bg: "#F1F5F9", color: "#475569", hoverBg: "#E2E8F0" },
  truck: { bg: "#FFF7ED", color: "#EA580C", hoverBg: "#FFEDD5" },
  agri: { bg: "#EFF6FF", color: "#2563EB", hoverBg: "#DBEAFE" },
};

function getCategoryColors(name: string): PastelColorSet {
  const lower = (name || "").toLowerCase();
  if (lower.includes("tractor")) return PASTEL_COLORS.tractor;
  if (lower.includes("bus") || lower.includes("van") || lower.includes("coach")) return PASTEL_COLORS.bus;
  if (lower.includes("const") || lower.includes("road") || lower.includes("mining")) return PASTEL_COLORS.constrn;
  if (lower.includes("crane") || lower.includes("lift")) return PASTEL_COLORS.crane;
  if (lower.includes("jcb") || lower.includes("excavator")) return PASTEL_COLORS.excavator;
  if (lower.includes("other")) return PASTEL_COLORS.other;
  if (lower.includes("truck") || lower.includes("mini tr") || lower.includes("3 wheeler") || lower.includes("lorry") || lower.includes("vehicle")) return PASTEL_COLORS.truck;
  if (lower.includes("agri") || lower.includes("tool")) return PASTEL_COLORS.agri;
  return PASTEL_COLORS.other;
}

export function CategoryCard({ category, onClick }: CategoryCardProps) {
  const id = category._id;
  const colors = getCategoryColors(category.category_name);

  return (
    <Box
      role="button"
      tabIndex={0}
      onClick={() => onClick?.(id)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick?.(id);
        }
      }}
      sx={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "flex-start",
        gap: 1.5,
        p: 2.25,
        width: 140,
        height: 140,
        flexShrink: 0,
        borderRadius: T.radius.lg,
        border: `1px solid ${T.color.border}`,
        bgcolor: T.color.surface,
        cursor: onClick ? "pointer" : "default",
        transition: "border-color 0.2s, box-shadow 0.2s, transform 0.2s",
        "&:hover": onClick
          ? {
              borderColor: alpha(colors.color, 0.45),
              boxShadow: T.shadow.card,
              transform: "translateY(-2px)",
              "& .category-icon-wrap": {
                bgcolor: colors.hoverBg,
                color: colors.color,
              },
            }
          : undefined,
      }}
    >
      <Box
        className="category-icon-wrap"
        sx={{
          width: 44,
          height: 44,
          borderRadius: 2,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          bgcolor: colors.bg,
          color: colors.color,
          transition: "background-color 0.2s, color 0.2s",
        }}
      >
        {React.createElement(getCategoryIcon(category.category_name), { sx: { fontSize: 24 } })}
      </Box>
      <Typography
        sx={{
          fontSize: 12.5,
          fontWeight: 600,
          textAlign: "center",
          color: T.color.textPrimary,
          lineHeight: 1.3,
          display: "-webkit-box",
          WebkitLineClamp: 2,
          WebkitBoxOrient: "vertical",
          overflow: "hidden",
        }}
      >
        {category.category_name}
      </Typography>
    </Box>
  );
}

export function CategoryScroller({ children }: { children: React.ReactNode }) {
  return (
    <Box
      sx={{
        display: "flex",
        gap: 1.75,
        overflowX: "auto",
        maxWidth: "100%",
        pb: 1.25,
        pt: 0.25,
        "&::-webkit-scrollbar": { height: 6 },
        "&::-webkit-scrollbar-thumb": {
          bgcolor: T.color.borderStrong,
          borderRadius: 999,
        },
      }}
    >
      {children}
    </Box>
  );
}
