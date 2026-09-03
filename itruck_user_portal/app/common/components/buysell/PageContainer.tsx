"use client";

import Box from "@mui/material/Box";
import { LAYOUT } from "@/lib/theme";

type PageContainerProps = {
  children: React.ReactNode;
  className?: string;
  sx?: Record<string, unknown>;
};

export function PageContainer({ children, className, sx = {} }: PageContainerProps) {
  return (
    <Box
      className={className}
      sx={{
        width: "100%",
        maxWidth: LAYOUT.contentMaxWidth,
        mx: "auto",
        px: LAYOUT.pageGutterX,
        minWidth: 0,
        overflow: "hidden",
        ...sx,
      }}
    >
      {children}
    </Box>
  );
}
