"use client";

import * as React from "react";
import Box from "@mui/material/Box";
import Grid from "@mui/material/Grid";
import { GRADIENT_AUTH, PRIMARY, NEUTRAL } from "@/lib/theme";
import { alpha } from "@mui/material/styles";

export interface AuthLayoutProps {
  leftContent: React.ReactNode;
  rightContent: React.ReactNode;
}

export function AuthLayout({ leftContent, rightContent }: AuthLayoutProps) {
  return (
    <Grid container sx={{ minHeight: "100vh", overflow: "hidden" }}>
      <Grid size={{ xs: 0, md: 5 }} sx={{ display: { xs: "none", md: "block" } }}>
        <Box
          sx={{
            position: "relative",
            minHeight: "100vh",
            background: GRADIENT_AUTH,
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            p: { md: 5, lg: 6 },
            overflow: "hidden",
          }}
        >
          <Box
            sx={{
              position: "absolute",
              inset: 0,
              backgroundImage: `
                radial-gradient(circle at 20% 20%, ${alpha("#fff", 0.12)} 0%, transparent 40%),
                radial-gradient(circle at 85% 75%, ${alpha(PRIMARY, 0.35)} 0%, transparent 45%),
                linear-gradient(180deg, transparent 60%, ${alpha(NEUTRAL[950], 0.35)} 100%)
              `,
              pointerEvents: "none",
            }}
          />
          <Box
            sx={{
              position: "absolute",
              width: 420,
              height: 420,
              borderRadius: "50%",
              border: `1px solid ${alpha("#fff", 0.12)}`,
              top: "55%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              pointerEvents: "none",
            }}
          />
          <Box
            sx={{
              position: "relative",
              zIndex: 1,
              flex: 1,
              display: "flex",
              flexDirection: "column",
            }}
          >
            {leftContent}
          </Box>
        </Box>
      </Grid>
      <Grid size={{ xs: 12, md: 7 }}>
        <Box
          sx={{
            minHeight: "100vh",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            bgcolor: NEUTRAL[50],
            p: { xs: 3, sm: 5, md: 6 },
            backgroundImage: `
              radial-gradient(ellipse at 100% 0%, ${alpha(PRIMARY, 0.06)} 0%, transparent 50%),
              radial-gradient(ellipse at 0% 100%, ${alpha(PRIMARY, 0.04)} 0%, transparent 40%)
            `,
          }}
        >
          <Box
            sx={{
              width: "100%",
              maxWidth: 440,
              p: { xs: 3, sm: 4 },
              borderRadius: 3,
              bgcolor: "#fff",
              border: `1px solid ${NEUTRAL[200]}`,
              boxShadow: "0 12px 40px rgba(15, 23, 42, 0.08)",
              animation: "authCardIn 320ms ease-out",
              "@keyframes authCardIn": {
                from: { opacity: 0, transform: "translateY(10px)" },
                to: { opacity: 1, transform: "translateY(0)" },
              },
            }}
          >
            {rightContent}
          </Box>
        </Box>
      </Grid>
    </Grid>
  );
}
