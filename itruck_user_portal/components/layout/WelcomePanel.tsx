"use client";

import * as React from "react";
import Typography from "@mui/material/Typography";
import Box from "@mui/material/Box";
import Link from "next/link";
import LocalShippingOutlinedIcon from "@mui/icons-material/LocalShippingOutlined";
import { alpha } from "@mui/material/styles";

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
    <>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 8 }}>
        <Box
          sx={{
            width: 48,
            height: 48,
            borderRadius: "14px",
            bgcolor: alpha("#fff", 0.12),
            backdropFilter: "blur(8px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            border: `1px solid ${alpha("#fff", 0.22)}`,
          }}
        >
          <LocalShippingOutlinedIcon sx={{ color: "#fff", fontSize: 26 }} />
        </Box>
        <Box>
          <Typography
            variant="h6"
            sx={{ color: "#fff", fontWeight: 800, letterSpacing: "-0.02em", lineHeight: 1.1 }}
          >
            TRUCKS99
          </Typography>
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
      </Box>

      <Typography
        variant="h3"
        sx={{
          color: "#fff",
          fontWeight: 800,
          mb: 2,
          letterSpacing: "-0.03em",
          lineHeight: 1.12,
          fontSize: { md: "2.35rem", lg: "2.75rem" },
        }}
      >
        {title}
      </Typography>
      <Typography
        sx={{
          color: alpha("#fff", 0.88),
          fontSize: "1.05rem",
          mb: 6,
          lineHeight: 1.65,
          maxWidth: 420,
        }}
      >
        {subtitle}
      </Typography>

      <Box sx={{ display: "flex", gap: 4, mb: 6, flexWrap: "wrap" }}>
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

      <Box sx={{ mt: "auto", pt: 4 }}>
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
    </>
  );
}
