"use client";

import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Link from "next/link";
import LocalShippingOutlinedIcon from "@mui/icons-material/LocalShippingOutlined";
import { PRODUCT_THEME as T, INFO, LAYOUT } from "@/lib/theme";
import { userProductRoutes } from "@/lib/userProductRoutes";

const FOOTER_LINKS = {
  company: [
    { label: "About Us", href: userProductRoutes.dashboard() },
    { label: "Contact", href: userProductRoutes.chat() },
    { label: "Careers", href: userProductRoutes.dashboard() },
  ],
  support: [
    { label: "Help Center", href: userProductRoutes.dashboard() },
    { label: "FAQ", href: userProductRoutes.emi() },
    { label: "EMI Calculator", href: userProductRoutes.emi() },
  ],
  legal: [
    { label: "Privacy Policy", href: "/privacy/policy" },
    { label: "Terms of Service", href: "/privacy/policy" },
  ],
};

type BuySellFooterProps = {
  /** Slim bar for fixed shell — full grid when false */
  compact?: boolean;
};

export function BuySellFooter({ compact = false }: BuySellFooterProps) {
  if (compact) {
    return (
      <Box
        sx={{
          width: "100%",
          bgcolor: T.color.trustNavyDark,
          color: "rgba(255,255,255,0.88)",
          borderTop: "1px solid rgba(255,255,255,0.12)",
          px: LAYOUT.pageGutterX,
          py: { xs: 1.25, md: 1.5 },
        }}
      >
        <Box
          sx={{
            width: "100%",
            maxWidth: LAYOUT.contentMaxWidth,
            mx: "auto",
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            justifyContent: "space-between",
            gap: { xs: 1, md: 2 },
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, minWidth: 0 }}>
            <LocalShippingOutlinedIcon sx={{ color: INFO, fontSize: 20, flexShrink: 0 }} />
            <Typography sx={{ fontWeight: 800, fontSize: 14, color: "#fff", whiteSpace: "nowrap" }}>
              TRUCKS99
            </Typography>
            <Typography
              sx={{
                fontSize: 11,
                opacity: 0.7,
                display: { xs: "none", sm: "block" },
                whiteSpace: "nowrap",
              }}
            >
              © {new Date().getFullYear()} iTruck
            </Typography>
          </Box>

          <Box
            sx={{
              display: "flex",
              flexWrap: "wrap",
              alignItems: "center",
              gap: { xs: 1, md: 2 },
              justifyContent: { xs: "flex-start", md: "flex-end" },
            }}
          >
            {[
              ...FOOTER_LINKS.support.slice(0, 2),
              FOOTER_LINKS.legal[0],
            ].map((item) => (
              <Link key={item.label} href={item.href} style={{ textDecoration: "none" }}>
                <Typography
                  sx={{
                    fontSize: 12,
                    color: "inherit",
                    opacity: 0.85,
                    whiteSpace: "nowrap",
                    "&:hover": { color: INFO, opacity: 1 },
                  }}
                >
                  {item.label}
                </Typography>
              </Link>
            ))}
            <Box sx={{ display: { xs: "none", md: "flex" }, gap: 0.75 }}>
              {["VISA", "MC", "UPI"].map((pay) => (
                <Box
                  key={pay}
                  sx={{
                    px: 1,
                    py: 0.35,
                    borderRadius: 1,
                    bgcolor: "rgba(255,255,255,0.08)",
                    fontSize: 9,
                    fontWeight: 700,
                  }}
                >
                  {pay}
                </Box>
              ))}
            </Box>
          </Box>
        </Box>
      </Box>
    );
  }

  return (
    <Box
      component="footer"
      sx={{
        width: "100%",
        bgcolor: T.color.trustNavyDark,
        color: "rgba(255,255,255,0.88)",
        py: 5,
        px: LAYOUT.pageGutterX,
      }}
    >
      <Box
        sx={{
          width: "100%",
          maxWidth: LAYOUT.contentMaxWidth,
          mx: "auto",
          display: "grid",
          gridTemplateColumns: { xs: "1fr", sm: "repeat(2, 1fr)", lg: "2fr repeat(3, 1fr)" },
          gap: 4,
        }}
      >
        <Box>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1.5 }}>
            <LocalShippingOutlinedIcon sx={{ color: INFO, fontSize: 24 }} />
            <Typography sx={{ fontWeight: 800, fontSize: 18, color: "#fff" }}>
              TRUCKS99
            </Typography>
          </Box>
          <Typography sx={{ fontSize: 13, lineHeight: 1.7, opacity: 0.85, maxWidth: 320 }}>
            India&apos;s trusted commercial vehicle marketplace. Buy, sell, and finance trucks,
            trailers, tippers, buses, and heavy equipment.
          </Typography>
          <Box sx={{ display: "flex", gap: 1, mt: 2 }}>
            {["FB", "IG", "YT", "LI"].map((label) => (
              <Box
                key={label}
                sx={{
                  width: 32,
                  height: 32,
                  borderRadius: "50%",
                  bgcolor: "rgba(255,255,255,0.1)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 11,
                  fontWeight: 700,
                }}
              >
                {label}
              </Box>
            ))}
          </Box>
        </Box>

        {(
          [
            { title: "Company", items: FOOTER_LINKS.company },
            { title: "Support", items: FOOTER_LINKS.support },
            { title: "Legal", items: FOOTER_LINKS.legal },
          ] as const
        ).map((col) => (
          <Box key={col.title}>
            <Typography sx={{ fontWeight: 700, color: "#fff", mb: 1.5 }}>{col.title}</Typography>
            {col.items.map((item) => (
              <Link key={item.label} href={item.href} style={{ textDecoration: "none" }}>
                <Typography
                  sx={{
                    fontSize: 13,
                    mb: 1,
                    color: "inherit",
                    opacity: 0.85,
                    "&:hover": { color: INFO, opacity: 1 },
                  }}
                >
                  {item.label}
                </Typography>
              </Link>
            ))}
          </Box>
        ))}
      </Box>

      <Box
        sx={{
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 2,
          mt: 4,
          pt: 3,
          borderTop: "1px solid rgba(255,255,255,0.12)",
        }}
      >
        <Typography sx={{ fontSize: 12, opacity: 0.7 }}>
          © {new Date().getFullYear()} iTruck · TRUCKS99 Commercial Vehicle Marketplace
        </Typography>
        <Box sx={{ display: "flex", gap: 1 }}>
          {["VISA", "MC", "UPI", "Razorpay"].map((pay) => (
            <Box
              key={pay}
              sx={{
                px: 1.25,
                py: 0.5,
                borderRadius: 1,
                bgcolor: "rgba(255,255,255,0.08)",
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: "0.04em",
              }}
            >
              {pay}
            </Box>
          ))}
        </Box>
      </Box>
    </Box>
  );
}
