"use client";

import * as React from "react";
import Box from "@mui/material/Box";
import { LAYOUT } from "@/lib/theme";

export interface PageContainerProps {
  children: React.ReactNode;
  maxWidth?: number | string;
  animate?: boolean;
  noPadding?: boolean;
  sx?: React.ComponentProps<typeof Box>["sx"];
}

export function PageContainer({
  children,
  maxWidth = LAYOUT.contentMaxWidth,
  animate = true,
  noPadding = false,
  sx,
}: PageContainerProps) {
  return (
    <Box
      className={animate ? "page-enter" : undefined}
      sx={{
        width: "100%",
        maxWidth,
        mx: "auto",
        px: { xs: 0, sm: 0.5 },
        minWidth: 0,
        overflow: "hidden",
        ...(noPadding ? {} : { pb: 2 }),
        ...sx,
      }}
    >
      {children}
    </Box>
  );
}
