"use client";

import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Link from "next/link";
import { Mail, Phone, MapPin, ArrowRight } from "lucide-react";
import { PRODUCT_THEME as T, INFO, LAYOUT } from "@/lib/theme";
import { userProductRoutes } from "@/lib/userProductRoutes";
import { BrandLogo } from "@/components/ui/BrandLogo";

/** lucide-react dropped brand/logo icons — small inline marks instead */
function FacebookIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M22 12.06C22 6.5 17.52 2 12 2S2 6.5 2 12.06c0 5 3.66 9.15 8.44 9.94v-7.03H7.9v-2.91h2.54V9.85c0-2.5 1.49-3.89 3.77-3.89 1.09 0 2.23.2 2.23.2v2.46h-1.26c-1.24 0-1.63.77-1.63 1.56v1.88h2.78l-.44 2.91h-2.34V22c4.78-.79 8.44-4.94 8.44-9.94Z" />
    </svg>
  );
}
function InstagramIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <rect x="2.5" y="2.5" width="19" height="19" rx="5" />
      <circle cx="12" cy="12" r="4.2" />
      <circle cx="17.3" cy="6.7" r="1.1" fill="currentColor" stroke="none" />
    </svg>
  );
}
function YoutubeIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M23 12s0-3.2-.4-4.73a3 3 0 0 0-2.1-2.1C18.9 4.75 12 4.75 12 4.75s-6.9 0-8.5.42a3 3 0 0 0-2.1 2.1C1 8.8 1 12 1 12s0 3.2.4 4.73a3 3 0 0 0 2.1 2.1c1.6.42 8.5.42 8.5.42s6.9 0 8.5-.42a3 3 0 0 0 2.1-2.1C23 15.2 23 12 23 12Z" opacity=".18" />
      <path d="M23 12s0-3.2-.4-4.73a3 3 0 0 0-2.1-2.1C18.9 4.75 12 4.75 12 4.75s-6.9 0-8.5.42a3 3 0 0 0-2.1 2.1C1 8.8 1 12 1 12s0 3.2.4 4.73a3 3 0 0 0 2.1 2.1c1.6.42 8.5.42 8.5.42s6.9 0 8.5-.42a3 3 0 0 0 2.1-2.1C23 15.2 23 12 23 12Z" fill="none" stroke="currentColor" strokeWidth="0" />
      <path d="M9.8 15.3V8.7l6 3.3-6 3.3Z" fill="currentColor" />
    </svg>
  );
}
function LinkedinIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M4.98 3.5C4.98 4.88 3.9 6 2.5 6S0 4.88 0 3.5 1.12 1 2.5 1s2.48 1.12 2.48 2.5ZM.24 8.25h4.5V23h-4.5V8.25ZM8.5 8.25h4.31v2.01h.06c.6-1.13 2.07-2.32 4.26-2.32 4.55 0 5.39 3 5.39 6.9V23h-4.5v-6.94c0-1.66-.03-3.79-2.31-3.79-2.32 0-2.67 1.81-2.67 3.68V23H8.5V8.25Z" />
    </svg>
  );
}

const FOOTER_LINKS = {
  company: [
    { label: "About Us", href: userProductRoutes.dashboard() },
    { label: "Contact", href: userProductRoutes.contact() },
    { label: "Careers", href: userProductRoutes.dashboard() },
  ],
  support: [
    { label: "Help Center", href: userProductRoutes.contact() },
    { label: "FAQ", href: userProductRoutes.emi() },
    { label: "EMI Calculator", href: userProductRoutes.emi() },
  ],
  legal: [
    { label: "Privacy Policy", href: userProductRoutes.legal("privacy") },
    { label: "Terms of Service", href: userProductRoutes.legal("terms") },
  ],
};

const SOCIALS = [
  { icon: FacebookIcon, label: "Facebook" },
  { icon: InstagramIcon, label: "Instagram" },
  { icon: YoutubeIcon, label: "YouTube" },
  { icon: LinkedinIcon, label: "LinkedIn" },
];

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
            <BrandLogo height={28} />
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
            {[...FOOTER_LINKS.legal, FOOTER_LINKS.support[0]].map((item) => (
              <Link key={item.label} href={item.href} prefetch={false} style={{ textDecoration: "none" }}>
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
    <Box component="footer" sx={{ width: "100%", bgcolor: T.color.trustNavyDark, color: "rgba(255,255,255,0.88)" }}>
      {/* ---- Newsletter / CTA strip ---- */}
      <Box
        sx={{
          borderBottom: "1px solid rgba(255,255,255,0.10)",
          px: LAYOUT.pageGutterX,
          py: { xs: 3.5, md: 4.5 },
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
            gap: 3,
          }}
        >
          <Box sx={{ maxWidth: 460 }}>
            <Typography sx={{ fontSize: { xs: 18, md: 20 }, fontWeight: 800, color: "#fff", mb: 0.5 }}>
              Get the best deals, delivered
            </Typography>
            <Typography sx={{ fontSize: 13, opacity: 0.75, lineHeight: 1.6 }}>
              New listings, price drops, and financing offers on trucks &amp; trailers — straight to your inbox.
            </Typography>
          </Box>

          <Box
            component="form"
            sx={{
              display: "flex",
              width: { xs: "100%", sm: "auto" },
              gap: 1.25,
            }}
          >
            <Box
              component="input"
              type="email"
              placeholder="Enter your email"
              sx={{
                flex: { xs: 1, sm: "0 0 260px" },
                bgcolor: "rgba(255,255,255,0.07)",
                border: "1px solid rgba(255,255,255,0.16)",
                borderRadius: 999,
                px: 2.25,
                py: 1.25,
                fontSize: 13,
                color: "#fff",
                outline: "none",
                "&::placeholder": { color: "rgba(255,255,255,0.5)" },
                "&:focus": { borderColor: INFO },
              }}
            />
            <Box
              component="button"
              type="submit"
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 0.75,
                bgcolor: INFO,
                color: "#fff",
                border: "none",
                borderRadius: 999,
                px: 2.5,
                fontWeight: 700,
                fontSize: 13,
                cursor: "pointer",
                whiteSpace: "nowrap",
                transition: "opacity 0.15s",
                "&:hover": { opacity: 0.9 },
              }}
            >
              Subscribe <ArrowRight size={15} />
            </Box>
          </Box>
        </Box>
      </Box>

      {/* ---- Main grid ---- */}
      <Box sx={{ px: LAYOUT.pageGutterX, py: { xs: 5, md: 7 } }}>
        <Box
          sx={{
            width: "100%",
            maxWidth: LAYOUT.contentMaxWidth,
            mx: "auto",
            display: "grid",
            gridTemplateColumns: { xs: "1fr", sm: "repeat(2, 1fr)", lg: "1.6fr repeat(3, 1fr) 1.3fr" },
            gap: { xs: 5, lg: 4 },
          }}
        >
          {/* Brand + description */}
          <Box sx={{ gridColumn: { xs: "1 / -1", sm: "auto" } }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
              <BrandLogo height={40} />
            </Box>
            <Typography sx={{ fontSize: 13, lineHeight: 1.75, opacity: 0.8, maxWidth: 340, mb: 2.5 }}>
              India&apos;s trusted commercial vehicle marketplace. Buy, sell, and finance trucks,
              trailers, tippers, buses, and heavy equipment — backed by verified sellers and
              secure payments.
            </Typography>
            <Box sx={{ display: "flex", gap: 1 }}>
              {SOCIALS.map(({ icon: Icon, label }) => (
                <Box
                  key={label}
                  component="a"
                  href="#"
                  aria-label={label}
                  sx={{
                    width: 36,
                    height: 36,
                    borderRadius: "50%",
                    bgcolor: "rgba(255,255,255,0.08)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "rgba(255,255,255,0.85)",
                    transition: "background-color 0.15s, color 0.15s",
                    "&:hover": { bgcolor: INFO, color: "#fff" },
                  }}
                >
                  <Icon size={16} />
                </Box>
              ))}
            </Box>
          </Box>

          {/* Link columns */}
          {(
            [
              { title: "Company", items: FOOTER_LINKS.company },
              { title: "Support", items: FOOTER_LINKS.support },
              { title: "Legal", items: FOOTER_LINKS.legal },
            ] as const
          ).map((col) => (
            <Box key={col.title}>
              <Typography
                sx={{
                  fontSize: 12,
                  fontWeight: 700,
                  letterSpacing: "0.06em",
                  textTransform: "uppercase",
                  color: "rgba(255,255,255,0.5)",
                  mb: 2,
                }}
              >
                {col.title}
              </Typography>
              <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
                {col.items.map((item) => (
                  <Link key={item.label} href={item.href} prefetch={false} style={{ textDecoration: "none" }}>
                    <Typography
                      sx={{
                        fontSize: 13.5,
                        color: "inherit",
                        opacity: 0.85,
                        transition: "opacity 0.15s, color 0.15s",
                        "&:hover": { color: INFO, opacity: 1 },
                      }}
                    >
                      {item.label}
                    </Typography>
                  </Link>
                ))}
              </Box>
            </Box>
          ))}

          {/* Contact block */}
          <Box sx={{ gridColumn: { xs: "1 / -1", sm: "auto" } }}>
            <Typography
              sx={{
                fontSize: 12,
                fontWeight: 700,
                letterSpacing: "0.06em",
                textTransform: "uppercase",
                color: "rgba(255,255,255,0.5)",
                mb: 2,
              }}
            >
              Get in Touch
            </Typography>
            <Box sx={{ display: "flex", flexDirection: "column", gap: 1.75 }}>
              <Box sx={{ display: "flex", alignItems: "flex-start", gap: 1.25 }}>
                <MapPin size={16} style={{ opacity: 0.6, marginTop: 2, flexShrink: 0 }} />
                <Typography sx={{ fontSize: 13, opacity: 0.85, lineHeight: 1.6 }}>
                  Krishnagiri, Tamil Nadu, India
                </Typography>
              </Box>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1.25 }}>
                <Phone size={16} style={{ opacity: 0.6, flexShrink: 0 }} />
                <Typography sx={{ fontSize: 13, opacity: 0.85 }}>+91 00000 00000</Typography>
              </Box>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1.25 }}>
                <Mail size={16} style={{ opacity: 0.6, flexShrink: 0 }} />
                <Typography sx={{ fontSize: 13, opacity: 0.85 }}>support@itruck.com</Typography>
              </Box>
            </Box>
          </Box>
        </Box>
      </Box>

      {/* ---- Bottom bar ---- */}
      <Box sx={{ borderTop: "1px solid rgba(255,255,255,0.10)", px: LAYOUT.pageGutterX, py: 2.75 }}>
        <Box
          sx={{
            width: "100%",
            maxWidth: LAYOUT.contentMaxWidth,
            mx: "auto",
            display: "flex",
            flexWrap: "wrap",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 2,
          }}
        >
          <Typography sx={{ fontSize: 12, opacity: 0.65 }}>
            © {new Date().getFullYear()} iTruck · TRUCKS99 Commercial Vehicle Marketplace. All rights reserved.
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
    </Box>
  );
}