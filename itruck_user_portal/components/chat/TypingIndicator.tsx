"use client";

import Box from "@mui/material/Box";
import CircularProgress from "@mui/material/CircularProgress";
import { PRIMARY, NEUTRAL } from "@/lib/theme";

export function TypingIndicator() {
  return (
    <Box
      sx={{
        display: "inline-flex",
        alignItems: "center",
        gap: 0.75,
        px: 1.5,
        py: 1,
        borderRadius: 3,
        bgcolor: NEUTRAL[100],
        color: NEUTRAL[600],
      }}
      aria-label="Assistant is typing"
    >
      <CircularProgress size={14} sx={{ color: PRIMARY }} />
      <Box
        component="span"
        sx={{
          display: "inline-flex",
          gap: 0.5,
          "& span": {
            width: 6,
            height: 6,
            borderRadius: "50%",
            bgcolor: PRIMARY,
            animation: "assistantDot 1.2s infinite ease-in-out",
          },
          "& span:nth-of-type(2)": { animationDelay: "0.15s" },
          "& span:nth-of-type(3)": { animationDelay: "0.3s" },
          "@keyframes assistantDot": {
            "0%, 80%, 100%": { opacity: 0.35, transform: "translateY(0)" },
            "40%": { opacity: 1, transform: "translateY(-3px)" },
          },
        }}
      >
        <span />
        <span />
        <span />
      </Box>
    </Box>
  );
}
