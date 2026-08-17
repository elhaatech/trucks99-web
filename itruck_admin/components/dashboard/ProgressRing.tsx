"use client";

import * as React from "react";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { PRIMARY, SECONDARY } from "@/lib/theme";

const CHART_COLORS = [PRIMARY, SECONDARY, "#4CAF50", "#2E7D32", "#FF9800"];

export interface ProgressRingProps {
  value: number;
  label?: string;
  size?: number;
  colorIndex?: number;
  centerLabel?: string;
}

export function ProgressRing({
  value,
  label,
  size = 80,
  colorIndex = 0,
  centerLabel,
}: ProgressRingProps) {
  const color = CHART_COLORS[colorIndex % CHART_COLORS.length];
  const strokeWidth = size * 0.12;
  const r = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * r;
  const offset = circumference - (value / 100) * circumference;

  return (
    <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
      <Box sx={{ position: "relative", width: size, height: size }}>
        <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke="rgba(0,0,0,0.08)"
            strokeWidth={strokeWidth}
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            style={{ transition: "stroke-dashoffset 0.4s ease" }}
          />
        </svg>
        <Box
          sx={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Typography variant="h6" fontWeight={700} color="text.primary">
            {centerLabel ?? `${Math.round(value)}%`}
          </Typography>
        </Box>
      </Box>
      {label && (
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1, textAlign: "center" }}>
          {label}
        </Typography>
      )}
    </Box>
  );
}
