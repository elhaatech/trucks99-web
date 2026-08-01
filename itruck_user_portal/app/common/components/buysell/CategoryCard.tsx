"use client";

import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import LocalShippingOutlinedIcon from "@mui/icons-material/LocalShippingOutlined";
import AirportShuttleOutlinedIcon from "@mui/icons-material/AirportShuttleOutlined";
import AgricultureOutlinedIcon from "@mui/icons-material/AgricultureOutlined";
import DirectionsBusOutlinedIcon from "@mui/icons-material/DirectionsBusOutlined";
import BuildOutlinedIcon from "@mui/icons-material/BuildOutlined";
import TerrainOutlinedIcon from "@mui/icons-material/TerrainOutlined";
import { alpha } from "@mui/material/styles";
import { PRODUCT_THEME as T, INFO, PRIMARY } from "@/lib/theme";
import type { Category } from "@/model/services/category";

type CategoryCardProps = {
  category: Category;
  onClick?: (categoryId: string) => void;
};

function getCategoryIcon(name: string) {
  const lower = (name || "").toLowerCase();
  if (lower.includes("truck") || lower.includes("lorry") || lower.includes("vehicle")) {
    return LocalShippingOutlinedIcon;
  }
  if (lower.includes("trailer") || lower.includes("tanker")) {
    return AirportShuttleOutlinedIcon;
  }
  if (lower.includes("jcb") || lower.includes("excavator") || lower.includes("crane")) {
    return AgricultureOutlinedIcon;
  }
  if (lower.includes("tipper") || lower.includes("dump")) {
    return TerrainOutlinedIcon;
  }
  if (lower.includes("bus") || lower.includes("coach")) {
    return DirectionsBusOutlinedIcon;
  }
  return BuildOutlinedIcon;
}

export function CategoryCard({ category, onClick }: CategoryCardProps) {
  const id = category._id;
  const Icon = getCategoryIcon(category.category_name);

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
              borderColor: alpha(PRIMARY, 0.45),
              boxShadow: T.shadow.card,
              transform: "translateY(-2px)",
              "& .category-icon-wrap": {
                bgcolor: alpha(PRIMARY, 0.14),
                color: PRIMARY,
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
          bgcolor: alpha(PRIMARY, 0.08),
          color: INFO,
          transition: "background-color 0.2s, color 0.2s",
        }}
      >
        <Icon sx={{ fontSize: 24 }} />
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
