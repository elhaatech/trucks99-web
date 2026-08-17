"use client";

import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import { PRODUCT_THEME as T, INFO } from "@/lib/theme";
import { userProductRoutes } from "@/lib/userProductRoutes";

type Crumb = { label: string; href?: string };

type ProductViewBreadcrumbsProps = {
  title: string;
  onNavigate: (href: string) => void;
};

export function ProductViewBreadcrumbs({ title, onNavigate }: ProductViewBreadcrumbsProps) {
  const crumbs: Crumb[] = [
    { label: "Home", href: userProductRoutes.dashboard() },
    { label: "Buy Vehicles", href: userProductRoutes.list() },
    { label: title },
  ];

  return (
    <Box
      sx={{
        display: "flex",
        flexWrap: "wrap",
        alignItems: "center",
        gap: 0.5,
        mb: 2,
        fontSize: 13,
      }}
    >
      {crumbs.map((crumb, index) => {
        const isLast = index === crumbs.length - 1;
        return (
          <Box key={`${crumb.label}-${index}`} sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
            {index > 0 ? (
              <ChevronRightIcon sx={{ fontSize: 16, color: T.color.textMuted }} />
            ) : null}
            {crumb.href && !isLast ? (
              <Typography
                component="button"
                onClick={() => onNavigate(crumb.href!)}
                sx={{
                  border: "none",
                  bgcolor: "transparent",
                  p: 0,
                  cursor: "pointer",
                  color: INFO,
                  fontWeight: 600,
                  fontSize: 13,
                  "&:hover": { textDecoration: "underline" },
                }}
              >
                {crumb.label}
              </Typography>
            ) : (
              <Typography
                sx={{
                  color: isLast ? T.color.textPrimary : T.color.textSecondary,
                  fontWeight: isLast ? 700 : 500,
                  fontSize: 13,
                  maxWidth: { xs: 180, sm: 320 },
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {crumb.label}
              </Typography>
            )}
          </Box>
        );
      })}
    </Box>
  );
}
