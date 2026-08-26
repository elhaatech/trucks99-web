"use client";

import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { alpha } from "@mui/material/styles";
import { PRODUCT_THEME as T, PRIMARY, LAYOUT } from "@/lib/theme";
import { BrandLogo } from "@/components/ui/BrandLogo";
import {
  FooterLinkColumn,
  FooterPaymentBadge,
  FooterContactItem,
} from "./FooterPrimitives";
import { FacebookIcon, InstagramIcon, WhatsappIcon } from "./footerIcons";
import { MapPin, Phone, Mail, Clock } from "lucide-react";
import Link from "next/link";
import {
  BOTTOM_LINKS,
  FOOTER_LINK_GROUPS,
  PAYMENT_METHODS,
} from "../../lib/footerConfig";

const SOCIALS = [
  // TODO: replace placeholder URLs with official social media links
  {
    icon: FacebookIcon,
    label: "Facebook",
    href: "https://www.facebook.com/trucks99",
  },
  {
    icon: InstagramIcon,
    label: "Instagram",
    href: "https://www.instagram.com/trucks99",
  },
  { icon: WhatsappIcon, label: "WhatsApp", href: "https://wa.me/91XXXXXXXXXX" },
];

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
          <Box
            sx={{ display: "flex", alignItems: "center", gap: 1, minWidth: 0 }}
          >
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
            }}
          >
            {BOTTOM_LINKS.slice(0, 2).map((item) => (
              <Link
                key={item.label}
                href={item.href}
                prefetch={false}
                style={{ textDecoration: "none" }}
              >
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
    <Box
      component="footer"
      sx={{
        width: "100%",
        bgcolor: T.color.trustNavyDark,
        color: "rgba(255,255,255,0.88)",
      }}
    >
      <Box
        sx={{
          px: LAYOUT.pageGutterX,
          pt: { xs: 5, md: 6 },
          pb: { xs: 3, md: 4 },
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
              lg: "repeat(4, 1fr)",
            },
            gap: { xs: 3, sm: 4, lg: 5 },
          }}
        >
          {/* Company */}
          <Box>
            <Box sx={{ mb: 1.5 }}>
              <BrandLogo height={36} />
            </Box>
            <Typography
              sx={{
                fontSize: 12.5,
                lineHeight: 1.65,
                opacity: 0.8,
                maxWidth: 280,
                mb: 2,
              }}
            >
              India&apos;s trusted commercial vehicle marketplace connecting
              buyers, sellers, dealers, fleet owners, transporters, and
              businesses across India.
            </Typography>
            <Box sx={{ display: "flex", gap: 1 }}>
              {SOCIALS.map(({ icon: Icon, label, href }) => (
                <Box
                  key={label}
                  component="a"
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
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
                    transition:
                      "background-color 0.15s, color 0.15s, transform 0.15s",
                    "&:hover": {
                      bgcolor: PRIMARY,
                      color: "#fff",
                      transform: "translateY(-2px)",
                    },
                  }}
                >
                  <Icon size={16} />
                </Box>
              ))}
            </Box>
          </Box>

          {/* Marketplace / Company / Support link groups */}
          {FOOTER_LINK_GROUPS.map((group) => (
            <Box key={group.title}>
              <FooterLinkColumn group={group} />
            </Box>
          ))}

          {/* Contact / Get in Touch
          <Box>
            <Typography
              sx={{
                fontSize: 12,
                fontWeight: 700,
                letterSpacing: "0.06em",
                textTransform: "uppercase",
                color: alpha(PRIMARY, 0.85),
                mb: 1.5,
              }}
            >
              Get in Touch
            </Typography>
            <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
              <FooterContactItem
                icon={<MapPin size={16} />}
                label="Address"
                value={"Coimbatore, Tamil Nadu, India"}
              />
              <FooterContactItem
                icon={<Phone size={16} />}
                label="Phone"
                value="+91 9150723962"
                href="tel:+919150723962"
              />
              <FooterContactItem
                icon={<WhatsappIcon size={16} />}
                label="WhatsApp"
                value="+91 9150723962"
                href="https://wa.me/+919150723962"
              />
              <FooterContactItem
                icon={<Mail size={16} />}
                label="Email"
                value="thetrucks99@gmail.com"
                href="mailto:thetrucks99@gmail.com"
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
    </Box>
  );
}
