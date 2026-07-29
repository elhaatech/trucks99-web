"use client";

import * as React from "react";
import Paper from "@mui/material/Paper";

export interface PageSectionProps {
  children: React.ReactNode;
  /** Less padding for dense filter strips */
  dense?: boolean;
}

/** Consistent padded surface for filters, tables, and forms. */
export function PageSection({ children, dense }: PageSectionProps) {
  return (
    <Paper
      elevation={0}
      sx={{
        p: dense ? 2 : 3,
        borderRadius: "12px",
        border: "1px solid",
        borderColor: "divider",
        mb: 3,
        boxShadow: (t) => t.tokens.shadow.card,
      }}
    >
      {children}
    </Paper>
  );
}
