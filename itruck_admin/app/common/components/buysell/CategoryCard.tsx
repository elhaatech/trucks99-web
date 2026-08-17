"use client";

import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { PRODUCT_THEME as T, INFO } from "@/lib/theme";
import type { Category } from "@/model/services/category";

type CategoryCardProps = {
  category: Category;
  onClick?: (categoryId: string) => void;
};

const CATEGORY_ICONS: Record<string, string> = {
  truck: "🚛",
  trailer: "🚚",
  jcb: "🏗️",
  tipper: "⛰️",
  bus: "🚌",
};

function getCategoryIcon(name: string): string {
  const lower = name.toLowerCase();
  for (const [key, icon] of Object.entries(CATEGORY_ICONS)) {
    if (lower.includes(key)) return icon;
  }
  return "🔧";
}

export function CategoryCard({ category, onClick }: CategoryCardProps) {
  const id = category._id;
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
        gap: 2,
        p: 3,
        width: 140,
        height: 140,
        flexShrink: 0,
        borderRadius: T.radius.lg,
        border: `1px solid ${T.color.border}`,
        bgcolor: T.color.surface,
        cursor: onClick ? "pointer" : "default",
        transition: "border-color 0.2s, box-shadow 0.2s",
        "&:hover": onClick
          ? { borderColor: INFO, boxShadow: T.shadow.card }
          : undefined,
      }}
    >
      <Typography sx={{ fontSize: 44, lineHeight: 1 }}>
        {getCategoryIcon(category.category_name)}
      </Typography>
      <Typography
        sx={{
          fontSize: 13,
          fontWeight: 700,
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
        gap: 2,
        overflowX: "auto",
        pb: 2,
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
