"use client";

import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Link from "next/link";
import { alpha } from "@mui/material/styles";
import { PRIMARY } from "@/lib/theme";
import type { FooterLink, FooterLinkGroup, FooterStat, TrustBadge } from "../../lib/footerConfig";

export function FooterLinkColumn({ group }: { group: FooterLinkGroup }) {
  return (
    <Box>
      <Typography
        sx={{
          fontSize: 12,
          fontWeight: 700,
          letterSpacing: "0.06em",
          textTransform: "uppercase",
          color: alpha(PRIMARY, 0.85),
          mb: 2,
        }}
      >
        {group.title}
      </Typography>
      <Box component="ul" sx={{ display: "flex", flexDirection: "column", gap: 1.5, listStyle: "none", p: 0, m: 0 }}>
        {group.links.map((item: FooterLink) => (
          <Box component="li" key={item.label}>
            <Link href={item.href} prefetch={false} style={{ textDecoration: "none" }}>
              <Typography
                sx={{
                  fontSize: 13.5,
                  color: "inherit",
                  opacity: 0.85,
                  transition: "opacity 0.15s, color 0.15s, padding-left 0.15s",
                  "&:hover": { color: PRIMARY, opacity: 1, pl: 0.5 },
                }}
              >
                {item.label}
              </Typography>
            </Link>
          </Box>
        ))}
      </Box>
    </Box>
  );
}

/** Dashboard-gauge styled stat card — tabular numerals, top tick that fills on hover */
export function FooterStatCard({ stat }: { stat: FooterStat }) {
  const Icon = stat.icon;
  return (
    <Box
      role="group"
      aria-label={`${stat.value} ${stat.label}`}
      sx={{
        position: "relative",
        borderRadius: 3,
        border: "1px solid rgba(255,255,255,0.10)",
        bgcolor: "rgba(255,255,255,0.03)",
        px: 2.5,
        py: 2.25,
        overflow: "hidden",
        transition: "transform 0.2s ease, border-color 0.2s ease, background-color 0.2s ease",
        "&:hover": {
          transform: "translateY(-3px)",
          borderColor: alpha(PRIMARY, 0.45),
          bgcolor: "rgba(255,255,255,0.05)",
        },
        "&:hover .stat-tick": { transform: "scaleX(1)" },
      }}
    >
      <Box
        className="stat-tick"
        sx={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: 2.5,
          bgcolor: PRIMARY,
          transform: "scaleX(0.28)",
          transformOrigin: "left",
          transition: "transform 0.3s ease",
        }}
      />
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
        <Box
          sx={{
            width: 30,
            height: 30,
            borderRadius: "50%",
            bgcolor: alpha(PRIMARY, 0.14),
            color: PRIMARY,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <Icon size={15} />
        </Box>
      </Box>
      <Typography
        sx={{
          fontSize: { xs: 20, md: 22 },
          fontWeight: 800,
          color: "#fff",
          fontVariantNumeric: "tabular-nums",
          letterSpacing: "-0.01em",
          lineHeight: 1.2,
        }}
      >
        {stat.value}
      </Typography>
      <Typography sx={{ fontSize: 12, opacity: 0.68, mt: 0.25 }}>{stat.label}</Typography>
    </Box>
  );
}

export function FooterTrustBadge({ badge }: { badge: TrustBadge }) {
  const Icon = badge.icon;
  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        gap: 1,
        px: 1.75,
        py: 1,
        borderRadius: 999,
        border: `1px solid ${alpha(PRIMARY, 0.28)}`,
        bgcolor: alpha(PRIMARY, 0.06),
        transition: "background-color 0.15s, border-color 0.15s",
        "&:hover": { bgcolor: alpha(PRIMARY, 0.14), borderColor: alpha(PRIMARY, 0.5) },
      }}
    >
      <Icon size={14} style={{ color: PRIMARY, flexShrink: 0 }} />
      <Typography sx={{ fontSize: 12.5, fontWeight: 600, color: "rgba(255,255,255,0.9)", whiteSpace: "nowrap" }}>
        {badge.label}
      </Typography>
    </Box>
  );
}

export function FooterPaymentBadge({ label }: { label: string }) {
  return (
    <Box
      sx={{
        px: 1.25,
        py: 0.5,
        borderRadius: 1.5,
        bgcolor: alpha(PRIMARY, 0.12),
        color: "#fff",
        fontSize: 10.5,
        fontWeight: 700,
        letterSpacing: "0.04em",
        border: "1px solid rgba(255,255,255,0.08)",
      }}
    >
      {label}
    </Box>
  );
}

export function FooterContactItem({
  icon,
  label,
  value,
  href,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  href?: string;
}) {
  const content = (
    <Box sx={{ display: "flex", alignItems: "flex-start", gap: 1.5 }}>
      <Box
        sx={{
          width: 34,
          height: 34,
          borderRadius: 2,
          bgcolor: alpha(PRIMARY, 0.12),
          color: PRIMARY,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
          mt: 0.1,
        }}
      >
        {icon}
      </Box>
      <Box>
        <Typography sx={{ fontSize: 11, opacity: 0.6, textTransform: "uppercase", letterSpacing: "0.05em", mb: 0.25 }}>
          {label}
        </Typography>
        <Typography sx={{ fontSize: 13.5, opacity: 0.92, lineHeight: 1.5, whiteSpace: "pre-line" }}>
          {value}
        </Typography>
      </Box>
    </Box>
  );
  if (!href) return content;
  return (
    <Link href={href} style={{ textDecoration: "none", color: "inherit" }}>
      {content}
    </Link>
  );
}
