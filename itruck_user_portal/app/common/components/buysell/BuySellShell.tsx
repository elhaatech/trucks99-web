"use client";

import { useEffect, useRef, useState } from "react";
import Box from "@mui/material/Box";
import Drawer from "@mui/material/Drawer";
import List from "@mui/material/List";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import Typography from "@mui/material/Typography";
import Divider from "@mui/material/Divider";
import { useRouter, usePathname } from "next/navigation";
import DirectionsCarOutlinedIcon from "@mui/icons-material/DirectionsCarOutlined";
import StarOutlineRoundedIcon from "@mui/icons-material/StarOutlineRounded";
import StorefrontOutlinedIcon from "@mui/icons-material/StorefrontOutlined";
import FavoriteBorderIcon from "@mui/icons-material/FavoriteBorder";
import ChatBubbleOutlineRoundedIcon from "@mui/icons-material/ChatBubbleOutlineRounded";
import { alpha } from "@mui/material/styles";
import { isSellHubPath, userProductRoutes } from "@/lib/userProductRoutes";
import {
  PRODUCT_THEME as T,
  INFO,
  PRIMARY,
  LAYOUT,
  Z_INDEX,
  TRANSITION,
} from "@/lib/theme";
import { BuySellHeader, BUYSELL_NAV_LINKS, MOBILE_EXTRA_LINKS } from "./BuySellHeader";

import { BuySellPageBack } from "./BuySellPageBack";
import { BrandLogo } from "@/components/ui/BrandLogo";
import { AssistantFab } from "@/components/chat/AssistantFab";
import { BuySellFooter } from "./footercomponents/footer/BuySellFooter";

type BuySellShellProps = {
  children: React.ReactNode;
};

function navIcon(label: string) {
  switch (label) {
    case "Buy Vehicle":
      return <DirectionsCarOutlinedIcon fontSize="small" />;
    case "Featured":
    case "Featured Vehicles":
      return <StarOutlineRoundedIcon fontSize="small" />;
    case "My Listings":
      return <StorefrontOutlinedIcon fontSize="small" />;
    case "Favorites":
    case "My Favorite List":
      return <FavoriteBorderIcon fontSize="small" />;
    case "AI Chatbot":
      return <ChatBubbleOutlineRoundedIcon fontSize="small" />;
    default:
      return <DirectionsCarOutlinedIcon fontSize="small" />;
  }
}

export function BuySellShell({ children }: BuySellShellProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const mainRef = useRef<HTMLElement>(null);
  const isHeroFlush =
    pathname === "/" ||
    pathname === userProductRoutes.dashboard();

  useEffect(() => {
    mainRef.current?.scrollTo({ top: 0, behavior: "auto" });
  }, [pathname]);

  return (
    <Box
      sx={{
        minHeight: "100dvh",
        display: "flex",
        flexDirection: "column",
        bgcolor: T.color.bg,
        backgroundImage: `
          radial-gradient(ellipse 80% 50% at 50% -20%, ${alpha(PRIMARY, 0.07)}, transparent),
          linear-gradient(180deg, ${T.color.bg} 0%, ${T.color.surfaceMuted} 100%)
        `,
      }}
    >
      <Box
        component="header"
        sx={{
          flexShrink: 0,
          width: "100%",
          zIndex: Z_INDEX.navbar,
          lineHeight: 0,
        }}
      >
        <BuySellHeader onMobileMenuToggle={() => setMobileOpen(true)} />
      </Box>

      <Drawer
        anchor="left"
        open={mobileOpen}
        onClose={() => setMobileOpen(false)}
        sx={{ display: { md: "none" }, zIndex: Z_INDEX.drawer }}
        PaperProps={{
          sx: {
            width: 300,
            bgcolor: T.color.surface,
            borderRight: `1px solid ${T.color.border}`,
          },
        }}
      >
        <Box sx={{ px: 2.5, pt: 3, pb: 2 }}>
          <BrandLogo height={36} />
          <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ display: "block", mt: 0.75 }}>
            Marketplace navigation
          </Typography>
        </Box>
        <Divider />
        <List sx={{ px: 1.5, py: 1.5 }}>
          {[...BUYSELL_NAV_LINKS, ...MOBILE_EXTRA_LINKS].map((link) => {
            const selected =
              link.label === "My Listings"
                ? isSellHubPath(pathname)
                : link.label === "Favorites" || link.label === "My Favorite List"
                  ? pathname === link.href
                  : link.label === "AI Chatbot"
                    ? pathname === link.href || pathname.startsWith(`${link.href}/`)
                    : pathname === link.href || pathname.startsWith(`${link.href}/`);

            return (
              <ListItemButton
                key={link.href}
                selected={selected}
                onClick={() => {
                  setMobileOpen(false);
                  router.push(link.href);
                }}
                sx={{
                  mb: 0.5,
                  borderRadius: 2,
                  py: 1.25,
                  "&.Mui-selected": {
                    bgcolor: alpha(PRIMARY, 0.1),
                    color: PRIMARY,
                    "&:hover": { bgcolor: alpha(PRIMARY, 0.14) },
                  },
                  transition: `all ${TRANSITION.fast}`,
                }}
              >
                <ListItemIcon
                  sx={{
                    minWidth: 40,
                    color: selected ? PRIMARY : T.color.textSecondary,
                  }}
                >
                  {navIcon(link.label)}
                </ListItemIcon>
                <ListItemText
                  primary={link.label}
                  primaryTypographyProps={{
                    fontWeight: selected ? 700 : 500,
                    fontSize: 14,
                    color: selected ? PRIMARY : "inherit",
                  }}
                />
              </ListItemButton>
            );
          })}
        </List>
      </Drawer>

      <Box
        ref={mainRef}
        component="main"
        id="buy-sell-main-scroll"
        sx={{
          flex: 1,
          minHeight: 0,
          width: "100%",
          pt: isHeroFlush ? 0 : LAYOUT.pageGutterTop,
          pb: { xs: 2.5, md: 3 },
        }}
      >
        <Box
          sx={{
            width: "100%",
            maxWidth: LAYOUT.contentMaxWidth,
            mx: "auto",
            px: LAYOUT.pageGutterX,
            animation: "pageFadeIn 280ms ease-out",
            "@keyframes pageFadeIn": {
              from: { opacity: 0, transform: "translateY(6px)" },
              to: { opacity: 1, transform: "translateY(0)" },
            },
          }}
        >
          <BuySellPageBack />
          {children}
        </Box>
      </Box>
      <Box
        component="footer"
        sx={{
          flexShrink: 0,
          width: "100%",
        }}
      >
        <BuySellFooter />
      </Box>
      <AssistantFab />
    </Box>
  );
}
