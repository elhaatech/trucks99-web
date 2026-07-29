"use client";

import Box from "@mui/material/Box";
import CircularProgress from "@mui/material/CircularProgress";
import Typography from "@mui/material/Typography";

export interface SpinnerProps {
  size?: number;
  fullHeight?: boolean;
  label?: string;
}

export function Spinner({ size = 40, fullHeight, label }: SpinnerProps) {
  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        gap: 2,
        ...(fullHeight ? { minHeight: 240 } : { py: 4 }),
      }}
    >
      <CircularProgress size={size} thickness={3.5} />
      {label ? (
        <Typography variant="body2" color="text.secondary" fontWeight={500}>
          {label}
        </Typography>
      ) : null}
    </Box>
  );
}
