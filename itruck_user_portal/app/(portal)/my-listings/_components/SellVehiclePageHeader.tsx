"use client";

import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import type { ReactNode } from "react";
import { PRODUCT_THEME as T } from "@/lib/theme";

type SellVehiclePageHeaderProps = {
  title: string;
  description: string;
  action?: ReactNode;
};

export function SellVehiclePageHeader({
  title,
  description,
  action,
}: SellVehiclePageHeaderProps) {
  return (
    <Box
      sx={{
        mb: 3,
        display: "flex",
        flexDirection: { xs: "column", sm: "row" },
        alignItems: { xs: "stretch", sm: "flex-start" },
        justifyContent: "space-between",
        gap: 2,
      }}
    >
      <Box sx={{ minWidth: 0 }}>
        <Typography
          component="h1"
          sx={{ fontWeight: 800, fontSize: { xs: 22, sm: 24 }, color: T.color.textPrimary }}
        >
          {title}
        </Typography>
        <Typography sx={{ color: T.color.textSecondary, mt: 0.75, lineHeight: 1.55 }}>
          {description}
        </Typography>
      </Box>
      {action ? (
        <Box sx={{ flexShrink: 0, alignSelf: { xs: "stretch", sm: "center" } }}>{action}</Box>
      ) : null}
    </Box>
  );
}
