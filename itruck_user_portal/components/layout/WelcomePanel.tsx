"use client";

import * as React from "react";
import Typography from "@mui/material/Typography";
import Box from "@mui/material/Box";
import Link from "next/link";
import { alpha } from "@mui/material/styles";
import { BrandLogo } from "@/components/ui/BrandLogo";

export interface WelcomePanelProps {
  title?: string;
  subtitle?: string;
  siteUrl?: string;
}

export function WelcomePanel({
  title = "Welcome to TRUCKS99",
  subtitle = "Buy and sell commercial vehicles with verified sellers across India.",
  siteUrl = "truck.elhaa.com",
}: WelcomePanelProps) {
  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        minHeight: { xs: "auto", md: 520 },
      }}
    >
      {/* ---- Top: logo, always pinned at the very top ---- */}
      <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
        <BrandLogo height={52} priority />
        <Typography
          sx={{
            color: alpha("#fff", 0.7),
            fontSize: 11,
            fontWeight: 600,
            letterSpacing: "0.1em",
            textTransform: "uppercase",
          }}
        >
          Vehicle Marketplace
        </Typography>
      </Box>

      {/* ---- Middle: heading, subtitle, stats — vertically centered in remaining space ---- */}
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          flex: 1,
        }}
      >
        <Typography
          variant="h3"
          sx={{
            color: "#fff",
            fontWeight: 800,
            mb: 2,
            letterSpacing: "-0.03em",
            lineHeight: 1.12,
            fontSize: { xs: "1.9rem", sm: "2.15rem", md: "2.35rem", lg: "2.75rem" },
          }}
        >
          {title}
        </Typography>
        <Typography
          sx={{
            color: alpha("#fff", 0.88),
            fontSize: { xs: "0.95rem", md: "1.05rem" },
            mb: 3,
            lineHeight: 1.65,
            maxWidth: { xs: "100%", sm: 380, md: 420 },
          }}
        >
          {subtitle}
        </Typography>

        <Box sx={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
          {[
            { value: "Verified", label: "Seller listings" },
            { value: "Secure", label: "OTP sign-in" },
            { value: "Fast", label: "Offers & deals" },
          ].map((stat) => (
            <Box key={stat.label}>
              <Typography sx={{ color: "#fff", fontWeight: 800, fontSize: 22 }}>
                {stat.value}
              </Typography>
              <Typography sx={{ color: alpha("#fff", 0.68), fontSize: 13, fontWeight: 500 }}>
                {stat.label}
              </Typography>
            </Box>
          ))}
        </Box>
      </Box>

      {/* ---- Bottom: footer, always pinned at the very bottom ---- */}
      <Box>
        <Link
          href="/"
          style={{
            color: "rgba(255,255,255,0.72)",
            fontSize: "0.875rem",
            textDecoration: "none",
            fontWeight: 500,
          }}
        >
          {siteUrl}
        </Link>
      </Box>
    </Box>
  );
}