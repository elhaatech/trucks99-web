"use client";

import * as React from "react";
import Typography from "@mui/material/Typography";
import Box from "@mui/material/Box";
import Link from "next/link";
import { PRIMARY } from "@/lib/theme";

export interface WelcomePanelProps {
  title?: string;
  subtitle?: string;
  siteUrl?: string;
}

export function WelcomePanel({
  title = "Welcome to iTruck",
  subtitle = "Your smart fleet and load management platform",
  siteUrl = "www.itruck.com",
}: WelcomePanelProps) {
  return (
    <>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 8 }}>
        <Box
          sx={{
            width: 44,
            height: 44,
            borderRadius: "12px",
            bgcolor: "rgba(255,255,255,0.15)",
            backdropFilter: "blur(8px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#fff",
            fontWeight: 800,
            fontSize: 16,
            letterSpacing: "-0.02em",
            border: "1px solid rgba(255,255,255,0.2)",
          }}
        >
          iT
        </Box>
        <Typography
          variant="h6"
          sx={{ color: "#fff", fontWeight: 700, letterSpacing: "0.06em" }}
        >
          iTruck
        </Typography>
      </Box>

      <Typography
        variant="h3"
        sx={{
          color: "#fff",
          fontWeight: 800,
          mb: 1.5,
          letterSpacing: "-0.025em",
          lineHeight: 1.15,
        }}
      >
        {title}
      </Typography>
      <Typography
        sx={{
          color: "rgba(255,255,255,0.88)",
          fontSize: "1.125rem",
          mb: 6,
          lineHeight: 1.6,
          maxWidth: 400,
        }}
      >
        {subtitle}
      </Typography>

      <Box
        sx={{
          display: "flex",
          gap: 3,
          mb: 6,
        }}
      >
        {[
          { value: "10K+", label: "Active Users" },
          { value: "50K+", label: "Loads Managed" },
          { value: "99%", label: "Uptime" },
        ].map((stat) => (
          <Box key={stat.label}>
            <Typography sx={{ color: "#fff", fontWeight: 800, fontSize: 24 }}>
              {stat.value}
            </Typography>
            <Typography sx={{ color: "rgba(255,255,255,0.7)", fontSize: 13 }}>
              {stat.label}
            </Typography>
          </Box>
        ))}
      </Box>

      <Box sx={{ mt: "auto", pt: 4 }}>
        <Link
          href="/"
          style={{
            color: "rgba(255,255,255,0.75)",
            fontSize: "0.875rem",
            textDecoration: "none",
          }}
        >
          {siteUrl}
        </Link>
      </Box>
    </>
  );
}
