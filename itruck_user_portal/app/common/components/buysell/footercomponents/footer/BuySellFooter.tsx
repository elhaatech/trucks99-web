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
    display: "grid",
    gridTemplateColumns: {
      xs: "1fr",
      sm: "repeat(2, 1fr)",
      lg: "1.5fr repeat(3, 1fr)", // was 5 tracks (1.5fr repeat(3,1fr) 1.3fr) — Contact column is commented out, drop the extra 1.3fr track
    },
    gap: { xs: 5, lg: 4 },
    alignItems: "start", // stops columns stretching to match the tallest one
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
<></>
  );
}

