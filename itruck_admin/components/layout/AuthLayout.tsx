"use client";

import * as React from "react";
import Box from "@mui/material/Box";
import Grid from "@mui/material/Grid";
import { GRADIENT_AUTH } from "@/lib/theme";

const blobSx = {
  position: "absolute" as const,
  borderRadius: "50%",
  filter: "blur(60px)",
  opacity: 0.4,
};

export interface AuthLayoutProps {
  leftContent: React.ReactNode;
  rightContent: React.ReactNode;
}

export function AuthLayout({ leftContent, rightContent }: AuthLayoutProps) {
  return (
    <Grid container sx={{ minHeight: "100vh", overflow: "hidden" }}>
      <Grid size={{ xs: 0, md: 6 }} sx={{ display: { xs: "none", md: "block" } }}>
        <Box
          sx={{
            position: "relative",
            minHeight: "100vh",
            background: GRADIENT_AUTH,
            display: { xs: "none", md: "flex" },
            flexDirection: "column",
            justifyContent: "space-between",
            p: 5,
            overflow: "hidden",
          }}
        >
          <Box
            sx={{
              ...blobSx,
              width: 320,
              height: 320,
              top: -80,
              left: -80,
              background: "rgba(255,255,255,0.08)",
            }}
          />
          <Box
            sx={{
              ...blobSx,
              width: 280,
              height: 280,
              bottom: "20%",
              right: -60,
              background: "rgba(255,255,255,0.06)",
            }}
          />
          <Box
            sx={{
              ...blobSx,
              width: 200,
              height: 200,
              top: "40%",
              left: "30%",
              background: "rgba(255,255,255,0.05)",
            }}
          />
          <Box
            sx={{
              position: "absolute",
              border: "2px solid rgba(255,255,255,0.12)",
              borderRadius: "50%",
              width: 420,
              height: 420,
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              opacity: 0.4,
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
      <Grid size={{ xs: 12, md: 6 }}>
        <Box
          sx={{
            minHeight: "100vh",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            bgcolor: "background.paper",
            p: { xs: 3, sm: 6 },
            backgroundImage:
              "radial-gradient(circle at 80% 20%, rgba(92, 77, 150, 0.03) 0%, transparent 50%)",
          }}
        >
          {rightContent}
        </Box>
      </Grid>
    </Grid>
  );
}
