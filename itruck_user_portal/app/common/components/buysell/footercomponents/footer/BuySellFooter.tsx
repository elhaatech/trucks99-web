"use client";

import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { Mail, Phone, MapPin, ArrowRight, Clock, Apple, PlayCircle } from "lucide-react";
import { alpha } from "@mui/material/styles";
import { PRODUCT_THEME as T, PRIMARY, LAYOUT } from "@/lib/theme";
import { userProductRoutes } from "@/lib/userProductRoutes";
import { BrandLogo } from "@/components/ui/BrandLogo";
import {
  FooterLinkColumn,
  FooterStatCard,
  FooterTrustBadge,
  FooterPaymentBadge,
  FooterContactItem,
} from "./FooterPrimitives";
import { FacebookIcon, InstagramIcon, YoutubeIcon, LinkedinIcon, WhatsappIcon } from "./footerIcons";
import Link from "next/link";
import { BOTTOM_LINKS, FOOTER_LINK_GROUPS, FOOTER_STATS, PAYMENT_METHODS, TRUST_BADGES } from "../../lib/footerConfig";

const SOCIALS = [
  { icon: FacebookIcon, label: "Facebook", href: "#" },
  { icon: InstagramIcon, label: "Instagram", href: "#" },
  { icon: LinkedinIcon, label: "LinkedIn", href: "#" },
  { icon: YoutubeIcon, label: "YouTube", href: "#" },
  { icon: WhatsappIcon, label: "WhatsApp", href: "#" },
];

/** Set true once store listings are live */
const APP_LINKS_READY = false;

type BuySellFooterProps = {
  /** Slim bar for fixed shell — full footer when false */
  compact?: boolean;
};

export function BuySellFooter({ compact = false }: BuySellFooterProps) {
  if (compact) {
    return (
<Box
  component="footer"
  sx={{
    width: "100%",
    bgcolor: T.color.trustNavyDark,
    color: "rgba(255,255,255,0.88)",
    borderTop: `1px solid ${alpha(PRIMARY, 0.22)}`,
    // px: LAYOUT.pageGutterX,
    // py: { xs: 2, md: 2.5 },        // was { xs: 1.25, md: 1.5 }
    // minHeight: { xs: 56, md: 64 }, // new — guarantees a consistent bar height
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
            <Typography sx={{ fontSize: 11, opacity: 0.7, display: { xs: "none", sm: "block" }, whiteSpace: "nowrap" }}>
              © {new Date().getFullYear()} iTruck
            </Typography>
          </Box>
          <Box sx={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: { xs: 1, md: 2 } }}>
            {BOTTOM_LINKS.slice(0, 2).map((item) => (
              <Link key={item.label} href={item.href} prefetch={false} style={{ textDecoration: "none" }}>
                <Typography
                  sx={{
                    fontSize: 12,
                    color: "inherit",
                    opacity: 0.85,
                    whiteSpace: "nowrap",
                    "&:hover": { color: PRIMARY, opacity: 1 },
                  }}
                >
                  {item.label}
                </Typography>
              </Link>
            ))}
            <Box sx={{ display: { xs: "none", md: "flex" }, gap: 0.75 }}>
              {PAYMENT_METHODS.slice(0, 3).map((pay) => (
                <FooterPaymentBadge key={pay} label={pay} />
              ))}
            </Box>
          </Box>
        </Box>
      </Box>
    );
  }

  return (
    <Box component="footer" sx={{ width: "100%", bgcolor: T.color.trustNavyDark, color: "rgba(255,255,255,0.88)" }}>
      {/* Section 1 — Newsletter / CTA */}
    

      {/* Sections 2–6 — brand, link groups, contact */}
      <Box sx={{ px: LAYOUT.pageGutterX, py: { xs: 5, md: 7 } }}>
        <Box
          sx={{
            width: "100%",
            maxWidth: LAYOUT.contentMaxWidth,
            mx: "auto",
            display: "grid",
            gridTemplateColumns: { xs: "1fr", sm: "repeat(2, 1fr)", lg: "1.5fr repeat(3, 1fr) 1.3fr" },
            gap: { xs: 5, lg: 4 },
          }}
        >
          {/* Company */}
          <Box sx={{ gridColumn: { xs: "1 / -1", sm: "auto" } }}>
            <Box sx={{ mb: 2 }}>
              <BrandLogo height={40} />
            </Box>
            <Typography sx={{ fontSize: 13, lineHeight: 1.75, opacity: 0.8, maxWidth: 340, mb: 2.5 }}>
              India&apos;s trusted commercial vehicle marketplace connecting buyers, sellers, dealers, fleet owners,
              transporters, and businesses across India.
            </Typography>
            <Box sx={{ display: "flex", gap: 1 }}>
              {SOCIALS.map(({ icon: Icon, label, href }) => (
                <Box
                  key={label}
                  component="a"
                  href={href}
                  aria-label={label}
                  sx={{
                    width: 36,
                    height: 36,
                    borderRadius: "50%",
                    bgcolor: alpha(PRIMARY, 0.12),
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "rgba(255,255,255,0.85)",
                    transition: "background-color 0.15s, color 0.15s, transform 0.15s",
                    "&:hover": { bgcolor: PRIMARY, color: "#fff", transform: "translateY(-2px)" },
                  }}
                >
                  <Icon size={16} />
                </Box>
              ))}
            </Box>
          </Box>

          {/* Marketplace / Company / Support link groups */}
          {FOOTER_LINK_GROUPS.map((group) => (
            <FooterLinkColumn key={group.title} group={group} />
          ))}

          {/* Contact
          <Box sx={{ gridColumn: { xs: "1 / -1", sm: "auto" } }}>
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
              Get in Touch
            </Typography>
            <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
              <FooterContactItem
                icon={<MapPin size={16} />}
                label="Address"
                value={"Krishnagiri, Tamil Nadu, India"}
              />
              <FooterContactItem icon={<Phone size={16} />} label="Phone" value="+91 XXXXX XXXXX" href="tel:+91XXXXXXXXXX" />
              <FooterContactItem
                icon={<WhatsappIcon size={16} />}
                label="WhatsApp"
                value="+91 XXXXX XXXXX"
                href="https://wa.me/91XXXXXXXXXX"
              />
              <FooterContactItem
                icon={<Mail size={16} />}
                label="Email"
                value="support@itruck.com"
                href="mailto:support@itruck.com"
              />
              <FooterContactItem
                icon={<Clock size={16} />}
                label="Working Hours"
                value={"Monday – Saturday\n9:00 AM – 7:00 PM"}
              />
            </Box>
          </Box> */}
        </Box>
      </Box>

      {/* Section 7 — Stats
      <Box sx={{ borderTop: `1px solid ${alpha(PRIMARY, 0.14)}`, px: LAYOUT.pageGutterX, py: { xs: 4, md: 5 } }}>
        <Box
          sx={{
            width: "100%",
            maxWidth: LAYOUT.contentMaxWidth,
            mx: "auto",
            display: "grid",
            gridTemplateColumns: { xs: "repeat(2, 1fr)", sm: "repeat(3, 1fr)", lg: "repeat(5, 1fr)" },
            gap: 1.5,
          }}
        >
          {FOOTER_STATS.map((stat) => (
            <FooterStatCard key={stat.label} stat={stat} />
          ))}
        </Box>
      </Box> */}

  
    </Box>
  );
}

function AppStoreBadge({ icon, line1, line2 }: { icon: React.ReactNode; line1: string; line2: string }) {
  return (
    <Box
      component="a"
      href="#"
      sx={{
        display: "flex",
        alignItems: "center",
        gap: 1,
        px: 1.75,
        py: 1,
        borderRadius: 2,
        border: "1px solid rgba(255,255,255,0.16)",
        color: "#fff",
        textDecoration: "none",
        transition: "border-color 0.15s, transform 0.15s",
        "&:hover": { borderColor: PRIMARY, transform: "translateY(-1px)" },
      }}
    >
      {icon}
      <Box sx={{ lineHeight: 1.15 }}>
        <Typography sx={{ fontSize: 9.5, opacity: 0.7 }}>{line1}</Typography>
        <Typography sx={{ fontSize: 13, fontWeight: 700 }}>{line2}</Typography>
      </Box>
    </Box>
  );
}
