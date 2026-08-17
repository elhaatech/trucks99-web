"use client";

import React, { useEffect, useRef, useState } from "react";
import {
  Box,
  Typography,
  Divider,
  Link as MuiLink,
  Paper,
  Stack,
  Button,
  Chip,
  Grid,
  Slide,
  Fade,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import { PageContainer } from "@/components/ui";
import KeyboardArrowUpOutlinedIcon from "@mui/icons-material/KeyboardArrowUpOutlined";
import EmailOutlinedIcon from "@mui/icons-material/EmailOutlined";
import PhoneOutlinedIcon from "@mui/icons-material/PhoneOutlined";
import PlaceOutlinedIcon from "@mui/icons-material/PlaceOutlined";
import PersonOutlineOutlinedIcon from "@mui/icons-material/PersonOutlineOutlined";
import SettingsSuggestOutlinedIcon from "@mui/icons-material/SettingsSuggestOutlined";
import VerifiedUserOutlinedIcon from "@mui/icons-material/VerifiedUserOutlined";
import CookieOutlinedIcon from "@mui/icons-material/CookieOutlined";
import ShareOutlinedIcon from "@mui/icons-material/ShareOutlined";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import ArchiveOutlinedIcon from "@mui/icons-material/ArchiveOutlined";
import GavelOutlinedIcon from "@mui/icons-material/GavelOutlined";
import HubOutlinedIcon from "@mui/icons-material/HubOutlined";
import ChildCareOutlinedIcon from "@mui/icons-material/ChildCareOutlined";
import UpdateOutlinedIcon from "@mui/icons-material/UpdateOutlined";
import SupportAgentOutlinedIcon from "@mui/icons-material/SupportAgentOutlined";
import HowToRegOutlinedIcon from "@mui/icons-material/HowToRegOutlined";
import LocalShippingOutlinedIcon from "@mui/icons-material/LocalShippingOutlined";
import ShieldOutlinedIcon from "@mui/icons-material/ShieldOutlined";
import AccessTimeOutlinedIcon from "@mui/icons-material/AccessTimeOutlined";
import BusinessOutlinedIcon from "@mui/icons-material/BusinessOutlined";
import { alpha } from "@mui/material/styles";

const EFFECTIVE_DATE = "03 July 2026";
const READ_TIME = "6 min read";
const SUPPORT_EMAIL = "pavithrap@elhaa.in";
const SUPPORT_PHONE = "+91-9360998982";
const COMPANY_ADDRESS =
  "Elhaa Technologies pvt ltd, 14, Pooja garden, Innovspace business centre, kalapatti road, coimbatore 641015, Tamil Nadu, India";

// ---------------------------------------------------------------------------
// Shared style tokens — every card / icon box pulls from these so nothing
// drifts out of sync between sections. Only state-dependent values
// (border color, shadow, reveal transform) are set per-instance.
// ---------------------------------------------------------------------------
const cardBaseSx = {
  borderRadius: 3,
  px: { xs: 2.5, sm: 4 },
  py: { xs: 3, sm: 4 },
  scrollMarginTop: "96px",
} as const;

const iconBoxSx = {
  width: 40,
  height: 40,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  borderRadius: "10px",
  flexShrink: 0,
} as const;

const compactIconBoxSx = {
  width: 32,
  height: 32,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  borderRadius: "8px",
  flexShrink: 0,
} as const;

const hideScrollbarSx = {
  scrollbarWidth: "none", // Firefox
  msOverflowStyle: "none", // old Edge/IE
  "&::-webkit-scrollbar": {
    display: "none", // Chrome/Safari
  },
} as const;

// ---------------------------------------------------------------------------
// Small presentational helpers — used across every section so bullets,
// sub-headings, and reveal timing stay visually consistent throughout.
// ---------------------------------------------------------------------------

/** Sub-heading used inside a section, e.g. "Personal Information". */
function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 0.75 }}>
      <Box sx={{ width: 3, height: 13, borderRadius: 1, bgcolor: "primary.main" }} />
      <Typography
        variant="overline"
        sx={{ color: "primary.main", fontWeight: 700, letterSpacing: 1, lineHeight: 1 }}
      >
        {children}
      </Typography>
    </Stack>
  );
}

/** Consistent bulleted list used for every policy item list — replaces the
 * default browser disc bullets with a small dot that matches the accent. */
function PolicyList({ items }: { items: string[] }) {
  return (
    <Stack spacing={0.85} sx={{ mb: 3, mt: 0.5 }}>
      {items.map((item) => (
        <Stack key={item} direction="row" spacing={1.5} alignItems="flex-start">
          <Box
            sx={{
              width: 6,
              height: 6,
              borderRadius: "50%",
              bgcolor: (t) => alpha(t.palette.primary.main, 0.6),
              mt: "9px",
              flexShrink: 0,
            }}
          />
          <Typography variant="body1" sx={{ color: "text.secondary", lineHeight: 1.75 }}>
            {item}
          </Typography>
        </Stack>
      ))}
    </Stack>
  );
}

/** A labelled row used in the "Contact Us" section, mirroring the footer's
 * icon + link pattern so the two feel like one system. */
function ContactRow({
  icon,
  children,
}: {
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Stack direction="row" spacing={1.5} alignItems="flex-start">
      <Box sx={{ color: "primary.main", mt: "2px", display: "flex" }}>{icon}</Box>
      <Typography variant="body1" sx={{ color: "text.secondary" }}>
        {children}
      </Typography>
    </Stack>
  );
}

interface PolicySection {
  id: string;
  title: string;
  shortLabel: string;
  icon: React.ReactNode;
  content: React.ReactNode;
}

const iconProps = { sx: { fontSize: 20 } };

const sections: PolicySection[] = [
  {
    id: "information-we-collect",
    title: "Information We Collect",
    shortLabel: "What we collect",
    icon: <PersonOutlineOutlinedIcon {...iconProps} />,
    content: (
      <>
        <Typography variant="body1" paragraph sx={{ color: "text.secondary" }}>
          We may collect the following types of information:
        </Typography>

        <SectionLabel>Personal Information</SectionLabel>
        <PolicyList
          items={[
            "Full Name",
            "Mobile Number",
            "Email Address",
            "Company Name",
            "Business Address",
            "Profile Photo",
            "Government-issued identification (where required)",
          ]}
        />

        <SectionLabel>Business Information</SectionLabel>
        <PolicyList
          items={[
            "Vehicle details",
            "Driver information",
            "Load information",
            "Pickup and delivery locations",
            "Business registration details",
            "GST Number (if applicable)",
          ]}
        />

        <SectionLabel>Payment Information</SectionLabel>
        <Typography variant="body1" paragraph sx={{ mt: 0.5, mb: 3, color: "text.secondary" }}>
          Subscription and payment details are processed through secure
          third-party payment providers. We do not store your debit card,
          credit card, UPI PIN, CVV, or banking credentials.
        </Typography>

        <SectionLabel>Device &amp; Technical Information</SectionLabel>
        <PolicyList
          items={[
            "IP Address",
            "Device Type",
            "Operating System",
            "Browser Information",
            "App Version",
            "Login Activity",
            "Cookies and Similar Technologies",
          ]}
        />

        <SectionLabel>Location Information</SectionLabel>
        <Typography variant="body1" paragraph sx={{ mt: 0.5, color: "text.secondary" }}>
          With your permission, we collect your device location to:
        </Typography>
        <PolicyList
          items={[
            "Match nearby loads and trucks",
            "Enable shipment tracking",
            "Improve logistics operations",
            "Provide location-based services",
          ]}
        />
      </>
    ),
  },
  {
    id: "how-we-use-your-information",
    title: "How We Use Your Information",
    shortLabel: "How we use it",
    icon: <SettingsSuggestOutlinedIcon {...iconProps} />,
    content: (
      <>
        <Typography variant="body1" paragraph sx={{ color: "text.secondary" }}>
          We use your information to:
        </Typography>
        <PolicyList
          items={[
            "Create and manage your account",
            "Verify your identity using OTP",
            "Connect transporters and shippers",
            "Process subscriptions and payments",
            "Facilitate bookings and logistics services",
            "Send notifications and service updates",
            "Respond to customer support requests",
            "Improve application performance",
            "Detect and prevent fraud",
            "Comply with legal and regulatory requirements",
          ]}
        />
      </>
    ),
  },
  {
    id: "otp-verification",
    title: "OTP Verification",
    shortLabel: "OTP verification",
    icon: <VerifiedUserOutlinedIcon {...iconProps} />,
    content: (
      <Typography variant="body1" paragraph sx={{ color: "text.secondary" }}>
        Your mobile number is verified using a One-Time Password (OTP). OTPs
        are used solely for authentication and account security.
      </Typography>
    ),
  },
  {
    id: "cookies-and-tracking-technologies",
    title: "Cookies and Tracking Technologies",
    shortLabel: "Cookies & tracking",
    icon: <CookieOutlinedIcon {...iconProps} />,
    content: (
      <>
        <Typography variant="body1" paragraph sx={{ color: "text.secondary" }}>
          We may use cookies and similar technologies to:
        </Typography>
        <PolicyList
          items={[
            "Maintain user sessions",
            "Remember preferences",
            "Improve website functionality",
            "Analyze usage patterns",
            "Enhance user experience",
          ]}
        />
        <Typography variant="body1" paragraph sx={{ color: "text.secondary" }}>
          You may disable cookies through your browser settings, although
          some features may not function properly.
        </Typography>
      </>
    ),
  },
  {
    id: "information-sharing",
    title: "Information Sharing",
    shortLabel: "Information sharing",
    icon: <ShareOutlinedIcon {...iconProps} />,
    content: (
      <>
        <Typography variant="body1" paragraph sx={{ color: "text.secondary" }}>
          We do not sell your personal information.
        </Typography>
        <Typography variant="body1" paragraph sx={{ color: "text.secondary" }}>
          Your information may be shared with:
        </Typography>
        <PolicyList
          items={[
            "Payment gateway providers",
            "SMS and email service providers",
            "Cloud hosting providers",
            "Logistics partners involved in shipment processing",
            "Government or regulatory authorities when required by applicable law",
          ]}
        />
      </>
    ),
  },
  {
    id: "data-security",
    title: "Data Security",
    shortLabel: "Data security",
    icon: <LockOutlinedIcon {...iconProps} />,
    content: (
      <>
        <Typography variant="body1" paragraph sx={{ color: "text.secondary" }}>
          We implement reasonable technical and organizational measures to
          protect your information, including:
        </Typography>
        <PolicyList
          items={[
            "SSL/TLS encryption",
            "Secure password storage",
            "OTP-based authentication",
            "Role-based access controls",
            "Firewall protection",
            "Regular security monitoring",
          ]}
        />
        <Typography variant="body1" paragraph sx={{ color: "text.secondary" }}>
          While we strive to protect your information, no method of
          transmission or electronic storage is completely secure.
        </Typography>
      </>
    ),
  },
  {
    id: "data-retention",
    title: "Data Retention",
    shortLabel: "Data retention",
    icon: <ArchiveOutlinedIcon {...iconProps} />,
    content: (
      <>
        <Typography variant="body1" paragraph sx={{ color: "text.secondary" }}>
          We retain your information only for as long as necessary to:
        </Typography>
        <PolicyList
          items={[
            "Provide our services",
            "Meet legal and regulatory obligations",
            "Resolve disputes",
            "Enforce our agreements",
            "Maintain business records",
          ]}
        />
      </>
    ),
  },
  {
    id: "your-rights",
    title: "Your Rights",
    shortLabel: "Your rights",
    icon: <GavelOutlinedIcon {...iconProps} />,
    content: (
      <>
        <Typography variant="body1" paragraph sx={{ color: "text.secondary" }}>
          Depending on applicable laws, you may have the right to:
        </Typography>
        <PolicyList
          items={[
            "Access your personal information",
            "Update or correct inaccurate information",
            "Request deletion of your account",
            "Withdraw consent where applicable",
            "Opt out of marketing communications",
          ]}
        />
        <Typography variant="body1" paragraph sx={{ color: "text.secondary" }}>
          Requests may be subject to legal or contractual limitations.
        </Typography>
      </>
    ),
  },
  {
    id: "third-party-services",
    title: "Third-Party Services",
    shortLabel: "Third-party services",
    icon: <HubOutlinedIcon {...iconProps} />,
    content: (
      <>
        <Typography variant="body1" paragraph sx={{ color: "text.secondary" }}>
          Our platform may integrate with third-party services, including:
        </Typography>
        <PolicyList
          items={[
            "Payment gateways",
            "SMS providers",
            "Email service providers",
            "Mapping and navigation services",
            "Cloud infrastructure providers",
          ]}
        />
        <Typography variant="body1" paragraph sx={{ color: "text.secondary" }}>
          These third parties operate under their own privacy policies.
        </Typography>
      </>
    ),
  },
  {
    id: "childrens-privacy",
    title: "Children's Privacy",
    shortLabel: "Children's privacy",
    icon: <ChildCareOutlinedIcon {...iconProps} />,
    content: (
      <Typography variant="body1" paragraph sx={{ color: "text.secondary" }}>
        Our services are intended for individuals who are at least 18 years
        of age. We do not knowingly collect personal information from
        children.
      </Typography>
    ),
  },
  {
    id: "changes-to-this-privacy-policy",
    title: "Changes to This Privacy Policy",
    shortLabel: "Policy changes",
    icon: <UpdateOutlinedIcon {...iconProps} />,
    content: (
      <Typography variant="body1" paragraph sx={{ color: "text.secondary" }}>
        We may update this Privacy Policy periodically. Any changes will
        become effective upon publication on this page. Continued use of the
        platform after updates constitutes acceptance of the revised Privacy
        Policy.
      </Typography>
    ),
  },
  {
    id: "contact-us",
    title: "Contact Us",
    shortLabel: "Contact us",
    icon: <SupportAgentOutlinedIcon {...iconProps} />,
    content: (
      <>
        <Typography variant="body1" paragraph sx={{ color: "text.secondary" }}>
          If you have any questions, concerns, or requests regarding this
          Privacy Policy, please contact us:
        </Typography>
        <Stack spacing={1.25}>
          <ContactRow icon={<BusinessOutlinedIcon sx={{ fontSize: 18 }} />}>
            <strong style={{ color: "inherit" }}>iTruck</strong>
          </ContactRow>
          <ContactRow icon={<EmailOutlinedIcon sx={{ fontSize: 18 }} />}>
            <MuiLink href={`mailto:${SUPPORT_EMAIL}`} underline="hover">
              {SUPPORT_EMAIL}
            </MuiLink>
          </ContactRow>
          <ContactRow icon={<PhoneOutlinedIcon sx={{ fontSize: 18 }} />}>
            <MuiLink href={`tel:${SUPPORT_PHONE}`} underline="hover">
              {SUPPORT_PHONE}
            </MuiLink>
          </ContactRow>
          <ContactRow icon={<PlaceOutlinedIcon sx={{ fontSize: 18 }} />}>
            {COMPANY_ADDRESS}
          </ContactRow>
        </Stack>
      </>
    ),
  },
  {
    id: "consent",
    title: "Consent",
    shortLabel: "Consent",
    icon: <HowToRegOutlinedIcon {...iconProps} />,
    content: (
      <Typography variant="body1" paragraph sx={{ color: "text.secondary" }}>
        By accessing or using the iTruck platform, you acknowledge that you
        have read, understood, and agreed to this Privacy Policy and consent
        to the collection, use, storage, and disclosure of your information
        as described herein.
      </Typography>
    ),
  },
];

const STICKY_TRIGGER = 260; // px scrolled before the compact header takes over

export default function PrivacyPolicyPage() {
  const theme = useTheme();
  const isDesktop = useMediaQuery(theme.breakpoints.up("md"));
  const [activeId, setActiveId] = useState(sections[0].id);
  const [progress, setProgress] = useState(0);
  const [isCompact, setIsCompact] = useState(false);
  const [revealed, setRevealed] = useState<Record<string, boolean>>({});
  const sectionRefs = useRef<Record<string, HTMLDivElement | null>>({});

  // Scroll-position tracking: progress bar, compact header, and active nav item.
  useEffect(() => {
    const handleScroll = () => {
      const doc = document.documentElement;
      const scrollTop = doc.scrollTop || document.body.scrollTop;
      const scrollHeight = doc.scrollHeight - doc.clientHeight;
      setProgress(scrollHeight > 0 ? (scrollTop / scrollHeight) * 100 : 0);
      setIsCompact(scrollTop > STICKY_TRIGGER);

      let current = sections[0].id;
      for (const section of sections) {
        const el = sectionRefs.current[section.id];
        if (el && el.getBoundingClientRect().top <= 160) {
          current = section.id;
        }
      }
      setActiveId(current);
    };

    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Gentle reveal-on-scroll for each card. Skipped entirely for anyone who
  // has asked their OS for reduced motion.
  useEffect(() => {
    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    if (prefersReducedMotion) {
      const all: Record<string, boolean> = {};
      sections.forEach((s) => (all[s.id] = true));
      setRevealed(all);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const id = (entry.target as HTMLElement).id;
            setRevealed((prev) => (prev[id] ? prev : { ...prev, [id]: true }));
          }
        });
      },
      { threshold: 0.08, rootMargin: "0px 0px -64px 0px" }
    );

    Object.values(sectionRefs.current).forEach((el) => el && observer.observe(el));
    return () => observer.disconnect();
  }, []);

  const scrollToSection = (id: string) => {
    const el = sectionRefs.current[id];
    if (el) {
      const y = el.getBoundingClientRect().top + window.scrollY - 88;
      window.scrollTo({ top: y, behavior: "smooth" });
    }
  };

  const scrollToTop = () => window.scrollTo({ top: 0, behavior: "smooth" });

  const activeSection = sections.find((s) => s.id === activeId) ?? sections[0];
  const activeIndex = sections.findIndex((s) => s.id === activeId);

  return (
    <Box sx={{ bgcolor: "grey.50", minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      {/* Reading-progress rail — always visible, sits above everything */}
      <Box sx={{ position: "fixed", top: 0, left: 0, right: 0, height: 3, zIndex: 1400 }}>
        <Box
          sx={{
            height: "100%",
            width: `${progress}%`,
            bgcolor: "primary.main",
            transition: "width 120ms linear",
          }}
        />
      </Box>

      {/* -------------------------------------------------------------- */}
      {/* Compact sticky header — slides in once you scroll past the hero */}
      {/* Shows the CURRENT section you're reading, not the static title  */}
      {/* -------------------------------------------------------------- */}
      <Slide direction="down" in={isCompact} mountOnEnter unmountOnExit>
        <Box
          sx={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            zIndex: 1300,
            bgcolor: "background.paper",
            borderBottom: "1px solid",
            borderColor: "divider",
            boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
          }}
        >
          <PageContainer maxWidth={1180} noPadding sx={{ px: { xs: 2, sm: 3 } }}>
            <Stack
              direction="row"
              alignItems="center"
              justifyContent="space-between"
              sx={{ height: 60 }}
              spacing={2}
            >
              <Stack direction="row" alignItems="center" spacing={1.5} sx={{ minWidth: 0 }}>
                <Box
                  sx={{
                    ...compactIconBoxSx,
                    bgcolor: (t) => alpha(t.palette.primary.main, 0.1),
                    color: "primary.main",
                  }}
                >
                  {activeSection.icon}
                </Box>
                <Box sx={{ minWidth: 0 }}>
                  <Typography
                    variant="caption"
                    sx={{ color: "text.secondary", display: "block", lineHeight: 1.2 }}
                  >
                    Privacy Policy &middot; {activeIndex + 1}/{sections.length}
                  </Typography>
                  <Fade in key={activeSection.id} timeout={250}>
                    <Typography
                      variant="subtitle2"
                      noWrap
                      sx={{ fontWeight: 700, color: "text.primary" }}
                    >
                      {activeSection.title}
                    </Typography>
                  </Fade>
                </Box>
              </Stack>

              <Stack direction="row" spacing={1} alignItems="center" sx={{ flexShrink: 0 }}>
                {isDesktop && (
                  <Chip
                    label={`${Math.round(progress)}% read`}
                    size="small"
                    sx={{
                      bgcolor: (t) => alpha(t.palette.primary.main, 0.08),
                      color: "primary.main",
                      fontWeight: 600,
                      display: { xs: "none", sm: "flex" },
                    }}
                  />
                )}
                <Button
                  onClick={scrollToTop}
                  size="small"
                  startIcon={<KeyboardArrowUpOutlinedIcon />}
                  sx={{ textTransform: "none", fontWeight: 600, color: "text.secondary" }}
                >
                  Top
                </Button>
              </Stack>
            </Stack>
          </PageContainer>
        </Box>
      </Slide>

      {/* ------------------------------------------------------------------ */}
      {/* Hero header — static, scrolls away naturally                      */}
      {/* ------------------------------------------------------------------ */}
      <Box
        component="header"
        sx={{
          width: "100%",
          position: "relative",
          overflow: "hidden",
          bgcolor: "background.paper",
          borderBottom: "1px solid",
          borderColor: "divider",
          pt: { xs: 5, md: 7 },
          pb: { xs: 5, md: 6 },
          "&::before": {
            content: '""',
            position: "absolute",
            top: "-40%",
            right: "-10%",
            width: 480,
            height: 480,
            borderRadius: "50%",
            background: (t) =>
              `radial-gradient(circle, ${alpha(t.palette.primary.main, 0.07)} 0%, transparent 70%)`,
            pointerEvents: "none",
          },
        }}
      >
        <PageContainer maxWidth={1180} noPadding sx={{ px: { xs: 2.5, sm: 3, md: 4 }, position: "relative" }}>
          <Stack direction="row" alignItems="center" spacing={1.25} sx={{ mb: 4 }}>
            <Box
              sx={{
                width: 34,
                height: 34,
                borderRadius: "8px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                bgcolor: (t) => alpha(t.palette.primary.main, 0.1),
                color: "primary.main",
              }}
            >
              <LocalShippingOutlinedIcon sx={{ fontSize: 19 }} />
            </Box>
            <Typography variant="subtitle1" sx={{ fontWeight: 700, color: "text.primary" }}>
              iTruck
            </Typography>
          </Stack>

          <Stack direction="row" spacing={1} sx={{ mb: 2.5, flexWrap: "wrap" }}>
            <Chip
              icon={<ShieldOutlinedIcon sx={{ fontSize: 15 }} />}
              label={`Effective ${EFFECTIVE_DATE}`}
              size="small"
              sx={{
                bgcolor: (t) => alpha(t.palette.primary.main, 0.08),
                color: "primary.main",
                fontWeight: 600,
                "& .MuiChip-icon": { color: "primary.main" },
              }}
            />
            <Chip
              icon={<AccessTimeOutlinedIcon sx={{ fontSize: 15 }} />}
              label={READ_TIME}
              size="small"
              variant="outlined"
              sx={{
                color: "text.secondary",
                borderColor: "divider",
                fontWeight: 600,
                "& .MuiChip-icon": { color: "text.secondary" },
              }}
            />
          </Stack>

          <Typography
            variant="h3"
            component="h1"
            sx={{ fontWeight: 800, letterSpacing: -0.5, color: "text.primary", mb: 2, maxWidth: 680 }}
          >
            Privacy Policy
          </Typography>
          <Typography sx={{ color: "text.secondary", maxWidth: 640, lineHeight: 1.75, fontSize: "1.05rem" }}>
            This explains how iTruck collects, uses, stores, discloses, and
            safeguards your information across the platform — web, mobile,
            and admin. Scroll through, or jump to any section below.
          </Typography>

          {/* Quick-jump chip row — mobile / tablet only; desktop uses the sidebar nav */}
          <Box
            sx={{
              mt: 3.5,
              display: { xs: "flex", md: "none" },
              flexWrap: "nowrap",
              gap: 1,
              overflowX: "auto",
              pb: 1,
              ...hideScrollbarSx,
            }}
          >
            {sections.map((section) => (
              <Chip
                key={section.id}
                label={section.shortLabel}
                onClick={() => scrollToSection(section.id)}
                variant={activeId === section.id ? "filled" : "outlined"}
                sx={{
                  flexShrink: 0,
                  fontWeight: 600,
                  cursor: "pointer",
                  ...(activeId === section.id
                    ? { bgcolor: "primary.main", color: "primary.contrastText" }
                    : { borderColor: "divider", color: "text.secondary" }),
                }}
              />
            ))}
          </Box>
        </PageContainer>
      </Box>

      {/* ------------------------------------------------------------------ */}
      {/* Content — sticky sidebar nav (desktop) + one card per section      */}
      {/* ------------------------------------------------------------------ */}
      <PageContainer
        maxWidth={1180}
        noPadding
        sx={{ flex: 1, px: { xs: 2.5, sm: 3, md: 4 }, py: { xs: 4, md: 6 } }}
      >
        <Grid container spacing={{ xs: 0, md: 5 }}>
          {/* Sidebar — desktop only */}
          <Grid
            size={{ xs: 0, md: 3 }}
            sx={{ display: { xs: "none", md: "block" } }}
          >
            <Box sx={{ position: "sticky", top: 96 }}>
              <Typography
                variant="caption"
                sx={{ color: "text.disabled", fontWeight: 700, letterSpacing: 1, pl: 1.5 }}
              >
                ON THIS PAGE
              </Typography>
              <Stack spacing={0.25} sx={{ mt: 1.5 }}>
                {sections.map((section, index) => {
                  const isActive = activeId === section.id;
                  return (
                    <Box
                      key={section.id}
                      component="button"
                      onClick={() => scrollToSection(section.id)}
                      aria-current={isActive ? "true" : undefined}
                      sx={{
                        appearance: "none",
                        border: "none",
                        bgcolor: isActive
                          ? (t) => alpha(t.palette.primary.main, 0.08)
                          : "transparent",
                        borderRadius: 2,
                        px: 1.5,
                        py: 1,
                        display: "flex",
                        alignItems: "center",
                        gap: 1.25,
                        cursor: "pointer",
                        textAlign: "left",
                        position: "relative",
                        transition: "background-color 150ms ease",
                        "&::before": {
                          content: '""',
                          position: "absolute",
                          left: 0,
                          top: "20%",
                          bottom: "20%",
                          width: 3,
                          borderRadius: 4,
                          bgcolor: "primary.main",
                          opacity: isActive ? 1 : 0,
                          transition: "opacity 150ms ease",
                        },
                        "&:hover": {
                          bgcolor: (t) => alpha(t.palette.primary.main, isActive ? 0.08 : 0.05),
                        },
                        "&:focus-visible": {
                          outline: (t) => `2px solid ${t.palette.primary.main}`,
                          outlineOffset: 2,
                        },
                      }}
                    >
                      <Typography
                        variant="caption"
                        sx={{
                          fontWeight: 700,
                          width: 20,
                          flexShrink: 0,
                          color: isActive ? "primary.main" : "text.disabled",
                        }}
                      >
                        {String(index + 1).padStart(2, "0")}
                      </Typography>
                      <Typography
                        variant="body2"
                        noWrap
                        sx={{
                          fontWeight: isActive ? 700 : 500,
                          color: isActive ? "primary.main" : "text.secondary",
                        }}
                      >
                        {section.shortLabel}
                      </Typography>
                    </Box>
                  );
                })}
              </Stack>

              <Divider sx={{ my: 2.5 }} />

              <Button
                fullWidth
                onClick={scrollToTop}
                size="small"
                startIcon={<KeyboardArrowUpOutlinedIcon />}
                sx={{ color: "text.secondary", textTransform: "none", fontWeight: 600, justifyContent: "flex-start", pl: 1.5 }}
              >
                Back to top
              </Button>
            </Box>
          </Grid>

          {/* Section cards */}
          <Grid size={{ xs: 12, md: 9 }}>
            <Grid container spacing={{ xs: 2.5, md: 3 }}>
              {sections.map((section, index) => {
                const isRevealed = !!revealed[section.id];
                const isActive = activeId === section.id;
                return (
                  <Grid size={12} key={section.id}>
                    <Paper
                      id={section.id}
                      ref={(el: HTMLDivElement | null) => {
                        sectionRefs.current[section.id] = el;
                      }}
                      elevation={0}
                      sx={{
                        ...cardBaseSx,
                        border: "1px solid",
                        borderColor: isActive ? "primary.main" : "divider",
                        boxShadow: isActive
                          ? (t) => `0 0 0 3px ${alpha(t.palette.primary.main, 0.08)}`
                          : "none",
                        opacity: isRevealed ? 1 : 0,
                        transform: isRevealed ? "translateY(0)" : "translateY(14px)",
                        transitionDelay: `${Math.min(index * 30, 150)}ms`,
                        transition:
                          "opacity 500ms ease, transform 500ms ease, border-color 200ms ease, box-shadow 200ms ease",
                      }}
                    >
                      <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 2.5 }}>
                        <Box
                          sx={{
                            ...iconBoxSx,
                            bgcolor: (t) => alpha(t.palette.primary.main, 0.1),
                            color: "primary.main",
                          }}
                        >
                          {section.icon}
                        </Box>
                        <Box>
                          <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 600 }}>
                            SECTION {String(index + 1).padStart(2, "0")}
                          </Typography>
                          <Typography variant="h5" component="h2" sx={{ fontWeight: 700, lineHeight: 1.2 }}>
                            {section.title}
                          </Typography>
                        </Box>
                      </Stack>
                      <Box sx={{ pl: { xs: 0, sm: "56px" } }}>{section.content}</Box>
                    </Paper>
                  </Grid>
                );
              })}
            </Grid>

            <Box sx={{ textAlign: "center", mt: 4, display: { xs: "block", md: "none" } }}>
              <Button
                onClick={scrollToTop}
                size="small"
                startIcon={<KeyboardArrowUpOutlinedIcon />}
                sx={{ color: "primary.main", textTransform: "none", fontWeight: 600 }}
              >
                Back to top
              </Button>
            </Box>
          </Grid>
        </Grid>
      </PageContainer>

      {/* ------------------------------------------------------------------ */}
      {/* Footer                                                             */}
      {/* ------------------------------------------------------------------ */}
      <Box component="footer" sx={{ width: "100%", bgcolor: "grey.900", color: "grey.100", mt: "auto" }}>
        <PageContainer maxWidth={1180} noPadding sx={{ px: { xs: 2.5, sm: 3, md: 4 }, py: { xs: 5, md: 6 } }}>
          <Grid container spacing={4}>
            <Grid size={{ xs: 12, md: 4 }}>
              <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1.5 }}>
                <Box
                  sx={{
                    width: 30,
                    height: 30,
                    borderRadius: "8px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    bgcolor: alpha("#ffffff", 0.08),
                  }}
                >
                  <LocalShippingOutlinedIcon sx={{ fontSize: 17 }} />
                </Box>
                <Typography variant="h6" sx={{ fontWeight: 700 }}>
                  iTruck
                </Typography>
              </Stack>
              <Typography variant="body2" sx={{ color: "grey.400", lineHeight: 1.7 }}>
                Connecting transporters and shippers with reliable load and
                truck matching, subscriptions, and secure payments.
              </Typography>
            </Grid>

            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.5, color: "grey.100" }}>
                Contact
              </Typography>
              <Stack spacing={1.25}>
                <Stack direction="row" spacing={1} alignItems="flex-start">
                  <EmailOutlinedIcon sx={{ fontSize: 18, color: "grey.500", mt: "2px" }} />
                  <MuiLink
                    href={`mailto:${SUPPORT_EMAIL}`}
                    sx={{ color: "grey.300", "&:hover": { color: "grey.100" } }}
                    variant="body2"
                    underline="hover"
                  >
                    {SUPPORT_EMAIL}
                  </MuiLink>
                </Stack>
                <Stack direction="row" spacing={1} alignItems="flex-start">
                  <PhoneOutlinedIcon sx={{ fontSize: 18, color: "grey.500", mt: "2px" }} />
                  <MuiLink
                    href={`tel:${SUPPORT_PHONE}`}
                    sx={{ color: "grey.300", "&:hover": { color: "grey.100" } }}
                    variant="body2"
                    underline="hover"
                  >
                    {SUPPORT_PHONE}
                  </MuiLink>
                </Stack>
                <Stack direction="row" spacing={1} alignItems="flex-start">
                  <PlaceOutlinedIcon sx={{ fontSize: 18, color: "grey.500", mt: "2px" }} />
                  <Typography variant="body2" sx={{ color: "grey.300" }}>
                    {COMPANY_ADDRESS}
                  </Typography>
                </Stack>
              </Stack>
            </Grid>

            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.5, color: "grey.100" }}>
                Legal
              </Typography>
              <Typography variant="body2" sx={{ color: "grey.300" }}>
                Privacy Policy &mdash; effective {EFFECTIVE_DATE}
              </Typography>
            </Grid>
          </Grid>

          <Divider sx={{ borderColor: "grey.800", my: 4 }} />

          <Stack
            direction={{ xs: "column", sm: "row" }}
            justifyContent="space-between"
            alignItems={{ xs: "flex-start", sm: "center" }}
            spacing={1.5}
          >
            <Typography variant="caption" sx={{ color: "grey.500" }}>
              &copy; {new Date().getFullYear()} iTruck / Elhaa Technologies Pvt Ltd. All rights reserved.
            </Typography>
            <Button
              onClick={scrollToTop}
              size="small"
              startIcon={<KeyboardArrowUpOutlinedIcon sx={{ fontSize: 16 }} />}
              sx={{ color: "grey.400", textTransform: "none", fontWeight: 600, "&:hover": { color: "grey.100" } }}
            >
              Back to top
            </Button>
          </Stack>
        </PageContainer>
      </Box>
    </Box>
  );
}