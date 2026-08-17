"use client";

import * as React from "react";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Typography from "@mui/material/Typography";
import Box from "@mui/material/Box";

export interface DashboardCardProps {
  title?: React.ReactNode;
  action?: React.ReactNode;
  children: React.ReactNode;
  sx?: object;
  onClick ?: () => void;
}

export function DashboardCard({ title, action, children, sx,onClick }: DashboardCardProps) {
  return (
    <Card
      sx={{
        // In `sx`, numbers are theme spacing multiples — use px strings for real corner radius.
        borderRadius: "12px",
        boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
        "&:hover": { boxShadow: "0 4px 20px rgba(0,0,0,0.08)" },
        ...sx,
      }}
      onClick={onClick}
    >
      <CardContent sx={{ p: 2.5, "&:last-child": { pb: 2.5 } }}>
        {(title || action) && (
          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 2 }}>
            {title && (
              <Typography variant="subtitle1" fontWeight={600} color="text.primary">
                {title}
              </Typography>
            )}
            {action && <Box>{action}</Box>}
          </Box>
        )}
        {children}
      </CardContent>
    </Card>
  );
}
