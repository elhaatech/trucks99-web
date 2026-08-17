"use client";

import * as React from "react";
import Typography from "@mui/material/Typography";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import { PRIMARY } from "@/lib/theme";

export interface SectionTitleProps {
  title: string;
  subtitle?: string;
  toggleOptions?: { label: string; value: string }[];
  toggleValue?: string;
  onToggleChange?: (value: string) => void;
}

export function SectionTitle({
  title,
  subtitle,
  toggleOptions,
  toggleValue,
  onToggleChange,
}: SectionTitleProps) {
  return (
    <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 1, mb: 2 }}>
      <Box>
        <Typography variant="subtitle1" fontWeight={600} color="text.primary">
          {title}
        </Typography>
        {subtitle && (
          <Typography variant="body2" color="text.secondary">
            {subtitle}
          </Typography>
        )}
      </Box>
      {toggleOptions && onToggleChange && (
        <Box sx={{ display: "flex", gap: 0.5 }}>
          {toggleOptions.map((opt) => (
            <Button
              key={opt.value}
              size="small"
              variant={toggleValue === opt.value ? "contained" : "outlined"}
              onClick={() => onToggleChange(opt.value)}
              sx={{
                minWidth: 64,
                ...(toggleValue === opt.value && {
                  bgcolor: PRIMARY,
                  "&:hover": { bgcolor: "#5a3d92" },
                }),
              }}
            >
              {opt.label}
            </Button>
          ))}
        </Box>
      )}
    </Box>
  );
}
