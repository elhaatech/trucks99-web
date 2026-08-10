"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import AppBar from "@mui/material/AppBar";
import Toolbar from "@mui/material/Toolbar";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import IconButton from "@mui/material/IconButton";
import Badge from "@mui/material/Badge";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import Divider from "@mui/material/Divider";
import InputBase from "@mui/material/InputBase";
import Avatar from "@mui/material/Avatar";
import Tooltip from "@mui/material/Tooltip";
import FavoriteBorderIcon from "@mui/icons-material/FavoriteBorder";
import MenuIcon from "@mui/icons-material/Menu";
import SearchIcon from "@mui/icons-material/Search";
import ChatBubbleOutlineRoundedIcon from "@mui/icons-material/ChatBubbleOutlineRounded";
import { BrandLogo } from "@/components/ui/BrandLogo";
import DashboardOutlinedIcon from "@mui/icons-material/DashboardOutlined";
import LogoutRoundedIcon from "@mui/icons-material/LogoutRounded";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import LocalOfferOutlinedIcon from "@mui/icons-material/LocalOfferOutlined";
import ShoppingBagOutlinedIcon from "@mui/icons-material/ShoppingBagOutlined";
import DirectionsCarOutlinedIcon from "@mui/icons-material/DirectionsCarOutlined";
import PersonOutlineOutlinedIcon from "@mui/icons-material/PersonOutlineOutlined";
import ContactSupportOutlinedIcon from "@mui/icons-material/ContactSupportOutlined";
import { alpha } from "@mui/material/styles";
import {
  INFO,
  LAYOUT,
  PRODUCT_THEME as T,
  GRADIENT,
  PRIMARY,
  SHADOW,
  TRANSITION,
} from "@/lib/theme";
import { isSellHubPath, userProductRoutes } from "@/lib/userProductRoutes";
import { getBuySellImageUrl } from "@/lib/buysellUtils";
import { useMarketplaceAuth } from "@/components/marketplace/MarketplaceAuthProvider";
import {
  MARKETPLACE_FAVORITES_CHANGED_EVENT,
} from "@/lib/marketplaceAuth";
import { getBuySellFavoriteCount } from "@/model/services/favoriteapi";

const NAV_LINKS = [
  { label: "Buy Vehicle", href: userProductRoutes.list() },
  { label: "Featured", href: userProductRoutes.featuredVehicles() },
  { label: "My Listings", href: userProductRoutes.sellVehicle() },
  { label: "Favorites", href: userProductRoutes.favorites() },
];

const MOBILE_EXTRA_LINKS = [
  { label: "AI Chatbot", href: userProductRoutes.assistant() },
];

type BuySellHeaderProps = {
  onMobileMenuToggle?: () => void;
};

export function BuySellHeader({ onMobileMenuToggle }: BuySellHeaderProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, logout: marketplaceLogout } = useMarketplaceAuth();
  const [favoriteCount, setFavoriteCount] = useState(0);
  const [userMenuAnchor, setUserMenuAnchor] = useState<null | HTMLElement>(null);
  const [headerSearch, setHeaderSearch] = useState("");

  const assistantActive =
    pathname === userProductRoutes.assistant() ||
    pathname.startsWith(`${userProductRoutes.assistant()}/`);

  const refreshCounts = useCallback(() => {
    if (!user) {
      setFavoriteCount(0);
      return;
    }
    getBuySellFavoriteCount()
      .then(setFavoriteCount)
      .catch(() => setFavoriteCount(0));
  }, [user]);

  useEffect(() => {
    refreshCounts();
  }, [refreshCounts]);

  useEffect(() => {
    const onFavoritesChanged = () => {
      refreshCounts();
    };
    window.addEventListener(
      MARKETPLACE_FAVORITES_CHANGED_EVENT,
      onFavoritesChanged,
    );
    return () =>
      window.removeEventListener(
        MARKETPLACE_FAVORITES_CHANGED_EVENT,
        onFavoritesChanged,
      );
  }, [refreshCounts]);

  const handleHeaderSearch = () => {
    router.push(
      userProductRoutes.list(headerSearch.trim() ? { q: headerSearch.trim() } : undefined),
    );
  };

  const isLinkActive = (link: { label: string; href: string }) => {
    if (link.label === "My Listings") return isSellHubPath(pathname);
    if (link.label === "Favorites" || link.label === "My Favorite List") {
      return pathname === userProductRoutes.favorites() || pathname === userProductRoutes.cart();
    }
    if (link.label === "AI Chatbot") return assistantActive;
    return pathname === link.href || pathname.startsWith(`${link.href}/`);
  };

  return (
    <AppBar
      position="sticky"
      elevation={0}
      sx={{
        bgcolor: alpha("#FFFFFF", 0.92),
        color: T.color.textPrimary,
        backdropFilter: "blur(12px)",
        borderBottom: `1px solid ${T.color.border}`,
        boxShadow: `${SHADOW.navbar} !important`,
      }}
    >
      <Toolbar
        disableGutters
        sx={{
          minHeight: `${LAYOUT.navbarHeight}px !important`,
          maxHeight: LAYOUT.navbarHeight,
          width: "100%",
          maxWidth: LAYOUT.contentMaxWidth,
          mx: "auto",
          px: LAYOUT.pageGutterX,
          py: 0,
          gap: { xs: 1, md: 2 },
        }}
      >
        <IconButton
          edge="start"
          sx={{
            display: { lg: "none" },
            border: `1px solid ${T.color.border}`,
            borderRadius: 2,
          }}
          onClick={onMobileMenuToggle}
          aria-label="Open menu"
        >
          <MenuIcon />
        </IconButton>

        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 1.25,
            cursor: "pointer",
            flexShrink: 0,
            transition: `opacity ${TRANSITION.fast}`,
            "&:hover": { opacity: 0.88 },
          }}
          onClick={() => router.push(userProductRoutes.dashboard())}
        >
          <BrandLogo height={40} priority />
          <Box sx={{ display: { xs: "none", sm: "block" } }}>
            <Typography
              sx={{
                fontSize: 10,
                fontWeight: 600,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                color: T.color.textMuted,
              }}
            >
              Marketplace
            </Typography>
          </Box>
        </Box>

        <Box sx={{ display: { xs: "none", lg: "flex" }, gap: 0.5, ml: 1.5 }}>
          {NAV_LINKS.map((link) => {
            const active = isLinkActive(link);
            const showFavoriteBadge =
              (link.label === "Favorites" || link.label === "My Favorite List") &&
              favoriteCount > 0;
            return (
              <Button
                key={link.href}
                onClick={() => router.push(link.href)}
                sx={{
                  textTransform: "none",
                  fontWeight: active ? 700 : 500,
                  color: active ? PRIMARY : T.color.textSecondary,
                  fontSize: 13.5,
                  px: 1.5,
                  py: 0.85,
                  minWidth: "auto",
                  gap: 0.75,
                  borderRadius: 2,
                  bgcolor: active ? alpha(PRIMARY, 0.08) : "transparent",
                  transition: `all ${TRANSITION.fast}`,
                  "&:hover": {
                    bgcolor: alpha(PRIMARY, 0.1),
                    color: PRIMARY,
                  },
                }}
              >
                {link.label === "Favorites" ? (
                  <FavoriteBorderIcon sx={{ fontSize: 18 }} />
                ) : null}
                {link.label}
                {showFavoriteBadge ? (
                  <Box
                    component="span"
                    sx={{
                      minWidth: 20,
                      height: 20,
                      px: 0.75,
                      borderRadius: 10,
                      bgcolor: PRIMARY,
                      color: "#fff",
                      fontSize: 11,
                      fontWeight: 700,
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    {favoriteCount}
                  </Box>
                ) : null}
              </Button>
            );
          })}
        </Box>

     
        <Box sx={{ display: "flex", alignItems: "center", gap: 1, ml: "auto" }}>
          <Tooltip title="AI Assistant">
            <Button
              onClick={() => router.push(userProductRoutes.assistant())}
              aria-label="Open AI Chatbot"
              startIcon={<ChatBubbleOutlineRoundedIcon sx={{ fontSize: 18 }} />}
              sx={{
                textTransform: "none",
                fontWeight: 700,
                fontSize: 13,
                minWidth: "auto",
                px: { xs: 1.25, sm: 1.75 },
                py: 0.85,
                borderRadius: 2.5,
                color: assistantActive ? "#fff" : T.color.textPrimary,
                background: assistantActive ? GRADIENT : alpha(PRIMARY, 0.06),
                border: assistantActive ? "none" : `1px solid ${alpha(PRIMARY, 0.2)}`,
                boxShadow: assistantActive ? SHADOW.primary : "none",
                "&:hover": {
                  background: GRADIENT,
                  color: "#fff",
                  borderColor: "transparent",
                },
                "& .MuiButton-startIcon": { mr: { xs: 0, sm: 0.75 } },
              }}
            >
              <Box component="span" sx={{ display: { xs: "none", sm: "inline" } }}>
                Assistant
              </Box>
            </Button>
          </Tooltip>

          <IconButton
            onClick={() => router.push(userProductRoutes.favorites())}
            aria-label="Favorites"
            sx={{
              display: { lg: "none" },
              border: `1px solid ${T.color.border}`,
              borderRadius: 2,
            }}
          >
            <Badge badgeContent={favoriteCount} color="primary" max={99}>
              <FavoriteBorderIcon sx={{ fontSize: 20 }} />
            </Badge>
          </IconButton>

          {user ? (
            <>
              <Button
                onClick={(e) => setUserMenuAnchor(e.currentTarget)}
                sx={{
                  textTransform: "none",
                  fontWeight: 600,
                  ml: 0.25,
                  gap: 1,
                  color: T.color.textPrimary,
                  borderRadius: 2.5,
                  px: 1,
                  py: 0.5,
                  border: `1px solid ${T.color.border}`,
                  "&:hover": { bgcolor: alpha(PRIMARY, 0.04) },
                }}
              >
                <Typography
                  sx={{
                    display: { xs: "none", sm: "block" },
                    fontSize: 13.5,
                    fontWeight: 600,
                    maxWidth: 120,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {user.name || "Account"}
                </Typography>
                <Avatar
                  src={getBuySellImageUrl(user.profileImage) || undefined}
                  alt={user.name || "Account"}
                  sx={{
                    width: 32,
                    height: 32,
                    bgcolor: PRIMARY,
                    fontSize: 13,
                    fontWeight: 700,
                  }}
                >
                  {(user.name || "U").charAt(0).toUpperCase()}
                </Avatar>
              </Button>
              <Menu
                anchorEl={userMenuAnchor}
                open={Boolean(userMenuAnchor)}
                onClose={() => setUserMenuAnchor(null)}
                transformOrigin={{ horizontal: "right", vertical: "top" }}
                anchorOrigin={{ horizontal: "right", vertical: "bottom" }}
                slotProps={{
                  paper: {
                    sx: { minWidth: 220, mt: 1 },
                  },
                }}
              >
                <Box sx={{ px: 2, py: 1.5, display: "flex", alignItems: "center", gap: 1.25 }}>
                  <Avatar
                    src={getBuySellImageUrl(user.profileImage) || undefined}
                    alt={user.name || "Account"}
                    sx={{ width: 40, height: 40, bgcolor: PRIMARY, fontSize: 15, fontWeight: 700 }}
                  >
                    {(user.name || "U").charAt(0).toUpperCase()}
                  </Avatar>
                  <Box sx={{ minWidth: 0 }}>
                    <Typography fontWeight={700} fontSize={14} noWrap>
                      {user.name || "Account"}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Marketplace account
                    </Typography>
                  </Box>
                </Box>
                <Divider />
                <MenuItem
                  onClick={() => {
                    setUserMenuAnchor(null);
                    router.push(userProductRoutes.profile());
                  }}
                >
                  <PersonOutlineOutlinedIcon sx={{ mr: 1.5, fontSize: 18, color: "text.secondary" }} />
                  My Profile
                </MenuItem>
                <MenuItem
                  onClick={() => {
                    setUserMenuAnchor(null);
                    router.push(userProductRoutes.dashboard());
                  }}
                >
                  <DashboardOutlinedIcon sx={{ mr: 1.5, fontSize: 18, color: "text.secondary" }} />
                  Dashboard
                </MenuItem>
                <MenuItem
                  onClick={() => {
                    setUserMenuAnchor(null);
                    router.push(userProductRoutes.sellVehicle());
                  }}
                >
                  <DirectionsCarOutlinedIcon sx={{ mr: 1.5, fontSize: 18, color: "text.secondary" }} />
                  My Listings
                </MenuItem>
                <MenuItem
                  onClick={() => {
                    setUserMenuAnchor(null);
                    router.push(userProductRoutes.offers());
                  }}
                >
                  <LocalOfferOutlinedIcon sx={{ mr: 1.5, fontSize: 18, color: "text.secondary" }} />
                  My Offers
                </MenuItem>
                {/* <MenuItem
                  onClick={() => {
                    setUserMenuAnchor(null);
                    router.push(userProductRoutes.purchases());
                  }}
                >
                  <ShoppingBagOutlinedIcon sx={{ mr: 1.5, fontSize: 18, color: "text.secondary" }} />
                  My Purchases
                </MenuItem> */}
                <MenuItem
                  onClick={() => {
                    setUserMenuAnchor(null);
                    router.push(userProductRoutes.contact());
                  }}
                >
                  <ContactSupportOutlinedIcon sx={{ mr: 1.5, fontSize: 18, color: "text.secondary" }} />
                  Contact Us
                </MenuItem>
                <Divider />
                <MenuItem
                  onClick={() => {
                    setUserMenuAnchor(null);
                    void marketplaceLogout().then(() => router.replace(userProductRoutes.list()));
                  }}
                  sx={{ color: "error.main" }}
                >
                  <LogoutRoundedIcon sx={{ mr: 1.5, fontSize: 18 }} />
                  Log out
                </MenuItem>
              </Menu>
            </>
          ) : (
            <Button
              variant="contained"
              size="small"
              onClick={() => router.push(userProductRoutes.login())}
              sx={{
                ml: 0.5,
                textTransform: "none",
                fontWeight: 700,
                borderRadius: 2.5,
                px: 2,
                background: GRADIENT,
                boxShadow: SHADOW.primary,
                "&:hover": { boxShadow: SHADOW.primaryLg },
              }}
            >
              Login
            </Button>
          )}
        </Box>
      </Toolbar>
    </AppBar>
  );
}

export { NAV_LINKS as BUYSELL_NAV_LINKS, MOBILE_EXTRA_LINKS };
