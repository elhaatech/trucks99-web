"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import dynamic from "next/dynamic";
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
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import InputBase from "@mui/material/InputBase";
import Avatar from "@mui/material/Avatar";
import Tooltip from "@mui/material/Tooltip";
import FavoriteBorderIcon from "@mui/icons-material/FavoriteBorder";
import MenuIcon from "@mui/icons-material/Menu";
import SearchIcon from "@mui/icons-material/Search";
import ChatBubbleOutlineRoundedIcon from "@mui/icons-material/ChatBubbleOutlineRounded";
import MarkChatUnreadOutlinedIcon from "@mui/icons-material/MarkChatUnreadOutlined";
import DashboardOutlinedIcon from "@mui/icons-material/DashboardOutlined";
import LogoutRoundedIcon from "@mui/icons-material/LogoutRounded";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import LocalOfferOutlinedIcon from "@mui/icons-material/LocalOfferOutlined";
import ShoppingBagOutlinedIcon from "@mui/icons-material/ShoppingBagOutlined";
import DirectionsCarOutlinedIcon from "@mui/icons-material/DirectionsCarOutlined";
import PersonOutlineOutlinedIcon from "@mui/icons-material/PersonOutlineOutlined";
import ContactSupportOutlinedIcon from "@mui/icons-material/ContactSupportOutlined";
import { alpha } from "@mui/material/styles";
import Link from "next/link";
import {
  INFO,
  LAYOUT,
  PRODUCT_THEME as T,
  GRADIENT,
  PRIMARY,
  SHADOW,
  TRANSITION,
  Z_INDEX,
} from "@/lib/theme";
import { isSellHubPath, userProductRoutes } from "@/lib/userProductRoutes";
import { getBuySellImageUrl, handleBuySellImageError } from "@/lib/buysellUtils";
import { useMarketplaceAuth } from "@/components/marketplace/MarketplaceAuthProvider";
import {
  MARKETPLACE_FAVORITES_CHANGED_EVENT,
  MARKETPLACE_CHAT_CHANGED_EVENT,
} from "@/lib/marketplaceAuth";
import { getBuySellFavoriteCount } from "@/model/services/favoriteapi";
import { getChatList } from "@/model/services/chatapi";
import { NotificationDropdown } from "@/components/common/NotificationDropdown";
import { withAppBasePath } from "@/lib/appConfig";
import { isAdminLikeRole } from "@/lib/permissions";

const ChatDrawer = dynamic(
  () => import("@/components/common/ChatDrawer").then((m) => m.ChatDrawer),
  { ssr: false },
);
const ChatInboxPage = dynamic(
  () => import("@/components/common/Chatinboxpage"),
  { ssr: false },
);

const NAV_LINKS = [
  { label: "Buy Vehicle", href: userProductRoutes.list() },
  { label: "Featured", href: userProductRoutes.featuredVehicles() },
  { label: "Sell Vehicle", href: userProductRoutes.sellVehicle() },
  { label: "Favorites", href: userProductRoutes.favorites() },
];

/** Always show every marketplace nav item, including My Listings for guests. */
export function getBuySellNavLinks(_isLoggedIn?: boolean) {
  return NAV_LINKS;
}

/** Guests who tap My Listings go to login and return to listings after sign-in. */
export function resolveBuySellNavHref(
  link: { label: string; href: string },
  isLoggedIn: boolean,
): string {
  if (link.label === "Sell Vehicle" && !isLoggedIn) {
    return userProductRoutes.login(userProductRoutes.sellVehicle());
  }
  if (link.label === "Messages" && !isLoggedIn) {
    return userProductRoutes.login(userProductRoutes.chat());
  }
  return link.href;
}

const MOBILE_EXTRA_LINKS = [
  { label: "Messages", href: userProductRoutes.chat() },
  { label: "AI Chatbot", href: userProductRoutes.assistant() },
];

type BuySellHeaderProps = {
  onMobileMenuToggle?: () => void;
};

export function BuySellHeader({ onMobileMenuToggle }: BuySellHeaderProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, userId, isLoggedIn, logout: marketplaceLogout } = useMarketplaceAuth();
  const navLinks = useMemo(() => getBuySellNavLinks(isLoggedIn), [isLoggedIn]);
  const [favoriteCount, setFavoriteCount] = useState(0);
  const [userMenuAnchor, setUserMenuAnchor] = useState<null | HTMLElement>(null);
  const [headerSearch, setHeaderSearch] = useState("");
  const [totalUnread, setTotalUnread] = useState(0);
  const [inboxOpen, setInboxOpen] = useState(false);
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);

  const assistantActive =
    pathname === userProductRoutes.assistant() ||
    pathname.startsWith(`${userProductRoutes.assistant()}/`);

  const refreshCounts = useCallback(() => {
    if (!isLoggedIn) {
      setFavoriteCount(0);
      return;
    }
    getBuySellFavoriteCount()
      .then(setFavoriteCount)
      .catch(() => setFavoriteCount(0));
  }, [isLoggedIn]);

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

  const refreshUnread = useCallback(async () => {
    if (!isLoggedIn) {
      setTotalUnread(0);
      return;
    }
    try {
      const rooms = await getChatList();
      const next = rooms.reduce((sum, r) => sum + (r.unreadCount || 0), 0);
      setTotalUnread((prev) => (prev === next ? prev : next));
    } catch {
      // badge stays as-is if the list call fails
    }
  }, [isLoggedIn]);

  useEffect(() => {
    if (!isLoggedIn) {
      setTotalUnread(0);
      return;
    }
    let lastAt = 0;
    const run = (force: boolean) => {
      const now = Date.now();
      if (!force && now - lastAt < 60_000) return;
      lastAt = now;
      void refreshUnread();
    };
    run(true);
    const onVisibility = () => {
      if (document.visibilityState === "visible") run(false);
    };
    const onChatChanged = () => {
      lastAt = Date.now();
      void refreshUnread();
    };
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener(MARKETPLACE_CHAT_CHANGED_EVENT, onChatChanged);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener(MARKETPLACE_CHAT_CHANGED_EVENT, onChatChanged);
    };
  }, [isLoggedIn, refreshUnread]);

  const openInbox = () => {
    if (!isLoggedIn) {
      router.push(userProductRoutes.login(userProductRoutes.chat()));
      return;
    }
    setInboxOpen(true);
    void refreshUnread();
  };

  const handleHeaderSearch = () => {
    router.push(
      userProductRoutes.list(headerSearch.trim() ? { q: headerSearch.trim() } : undefined),
    );
  };

  const isLinkActive = (link: { label: string; href: string }) => {
    if (link.label === "Sell Vehicle") return isSellHubPath(pathname);
    if (link.label === "Favorites" || link.label === "My Favorite List") {
      return pathname === userProductRoutes.favorites() || pathname === userProductRoutes.cart();
    }
    if (link.label === "AI Chatbot") return assistantActive;
    return pathname === link.href || pathname.startsWith(`${link.href}/`);
  };

  return (
    <>
    <AppBar
      position="fixed"
      elevation={0}
      sx={{
        top: 0,
        bgcolor: "#ffffff",
        color: T.color.textPrimary,
        borderBottom: `1px solid ${T.color.border}`,
        boxShadow: `${SHADOW.navbar} !important`,
        zIndex: Z_INDEX.navbar,
      }}
    >
      <Toolbar
        disableGutters
        sx={{
          minHeight: { xs: "72px !important", md: "80px !important" },
          maxHeight: { xs: "72px", md: "80px" },
          width: "100%",
          maxWidth: LAYOUT.contentMaxWidth,
          mx: "auto",
          px: LAYOUT.pageGutterX,
          py: 0,
          gap: { xs: 1, md: 2 },
          minWidth: 0,
        }}
      >
        <IconButton
          edge="start"
          sx={{
            display: { lg: "none" },
            border: `1px solid ${T.color.border}`,
            borderRadius: 2,
            transition: `all ${TRANSITION.fast}`,
            "&:hover": {
              bgcolor: alpha(PRIMARY, 0.06),
              borderColor: alpha(PRIMARY, 0.3),
            },
          }}
          onClick={onMobileMenuToggle}
          aria-label="Open menu"
        >
          <MenuIcon />
        </IconButton>

        <Link
          href="/"
          aria-label="TRUCKS99 — Home"
          style={{
            textDecoration: "none",
            display: "flex",
            alignItems: "center",
            flexShrink: 0,
          }}
        >
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              cursor: "pointer",
              flexShrink: 0,
              transition: `opacity ${TRANSITION.fast}`,
              "&:hover": { opacity: 0.85 },
            }}
          >
            <Box
              sx={{
                width: { xs: 72, md: 90 },
                height: { xs: 48, md: 60 },
                flexShrink: 0,
                lineHeight: 0,
              }}
            >
              <Box
                component="img"
                src={withAppBasePath("/assets/logo.png")}
                alt="TRUCKS99"
                width={60}
                height={40}
                sx={{
                  width: "100%",
                  height: "100%",
                  objectFit: "contain",
                  display: "block",
                }}
              />
            </Box>
          </Box>
        </Link>

        <Box sx={{ display: { xs: "none", lg: "flex" }, gap: 0.5, ml: 1.5, minWidth: 0, flexShrink: 1 }}>
          {[{ label: "Marketplace", href: "/#explore-all-vehicles" }, ...navLinks].map(
            (link) => {
            const active = isLinkActive(link);
            const showFavoriteBadge =
              (link.label === "Favorites" || link.label === "My Favorite List") &&
              favoriteCount > 0;
            const isMarketplaceTab = link.label === "Marketplace";
            return (
              <Button
                key={link.href}
                onClick={() => {
                  if (isMarketplaceTab) {
                    if (pathname === "/") {
                      if (window.location.hash !== "#explore-all-vehicles") {
                        window.location.hash = "explore-all-vehicles";
                      } else {
                        document
                          .getElementById("explore-all-vehicles")
                          ?.scrollIntoView({ behavior: "smooth" });
                      }
                      return;
                    }
                    router.push("/#explore-all-vehicles");
                    return;
                  }
                  router.push(resolveBuySellNavHref(link, isLoggedIn));
                }}
                sx={{
                  textTransform: "none",
                  fontWeight: active ? 700 : 500,
                  color: active ? PRIMARY : T.color.textSecondary,
                  fontSize: 13.5,
                  px: { xs: 1, md: 1.5 },
                  py: { xs: 0.75, md: 0.85 },
                  minHeight: 36,
                  minWidth: "auto",
                  gap: 0.75,
                  borderRadius: 2,
                  bgcolor: active ? alpha(PRIMARY, 0.08) : "transparent",
                  transition: `all ${TRANSITION.fast}`,
                  "&:hover": {
                    bgcolor: alpha(PRIMARY, 0.1),
                    color: PRIMARY,
                    transform: "translateY(-1px)",
                  },
                  "&:active": { transform: "scale(0.97)" },
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
                display: { xs: "none", sm: "inline-flex" },
                textTransform: "none",
                fontWeight: 700,
                fontSize: 13,
                minWidth: "auto",
                px: { xs: 1.25, sm: 1.75 },
                py: { xs: 0.75, md: 0.85 },
                minHeight: 36,
                borderRadius: 2.5,
                color: assistantActive ? "#fff" : T.color.textPrimary,
                background: assistantActive ? GRADIENT : alpha(PRIMARY, 0.06),
                border: assistantActive ? "none" : `1px solid ${alpha(PRIMARY, 0.2)}`,
                boxShadow: assistantActive ? SHADOW.primary : "none",
                transition: `all ${TRANSITION.fast}`,
                "&:hover": {
                  background: GRADIENT,
                  color: "#fff",
                  borderColor: "transparent",
                  transform: "translateY(-1px)",
                  boxShadow: SHADOW.primaryLg,
                },
                "&:active": { transform: "translateY(0)" },
                "& .MuiButton-startIcon": { mr: { xs: 0, sm: 0.75 } },
              }}
            >
              <Box component="span" sx={{ display: { xs: "none", sm: "inline" } }}>
                Assistant
              </Box>
            </Button>
          </Tooltip>

          {!isAdminLikeRole(user?.role ?? null) ? <NotificationDropdown /> : null}

          <Tooltip title="Messages">
            <IconButton
              onClick={openInbox}
              aria-label="Messages"
              sx={{
                border: `1px solid ${T.color.border}`,
                borderRadius: 2,
                transition: `all ${TRANSITION.fast}`,
                "&:hover": {
                  bgcolor: alpha(PRIMARY, 0.06),
                  borderColor: alpha(PRIMARY, 0.3),
                },
              }}
            >
              <Badge badgeContent={isLoggedIn ? totalUnread : 0} color="error" max={99}>
                <MarkChatUnreadOutlinedIcon sx={{ fontSize: 20 }} />
              </Badge>
            </IconButton>
          </Tooltip>

          <IconButton
            onClick={() => router.push(userProductRoutes.favorites())}
            aria-label="Favorites"
            sx={{
              display: { lg: "none" },
              border: `1px solid ${T.color.border}`,
              borderRadius: 2,
              transition: `all ${TRANSITION.fast}`,
              "&:hover": {
                bgcolor: alpha(PRIMARY, 0.06),
                borderColor: alpha(PRIMARY, 0.3),
              },
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
                  px: { xs: 1, sm: 1.25 },
                  py: 0.75,
                  minHeight: 36,
                  border: `1px solid ${T.color.border}`,
                  transition: `all ${TRANSITION.fast}`,
                  "&:hover": {
                    bgcolor: alpha(PRIMARY, 0.06),
                    borderColor: alpha(PRIMARY, 0.25),
                  },
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
                  slotProps={{ img: { onError: handleBuySellImageError } }}
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
                    slotProps={{ img: { onError: handleBuySellImageError } }}
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
                    openInbox();
                  }}
                >
                  <MarkChatUnreadOutlinedIcon sx={{ mr: 1.5, fontSize: 18, color: "text.secondary" }} />
                  Messages
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
                  Sell Vehicle
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
                py: 0.75,
                minHeight: 36,
                background: GRADIENT,
                boxShadow: SHADOW.primary,
                transition: `all ${TRANSITION.fast}`,
                "&:hover": {
                  boxShadow: SHADOW.primaryLg,
                  transform: "translateY(-1px)",
                },
                "&:active": { transform: "translateY(0)" },
              }}
            >
              Login
            </Button>
          )}
        </Box>
      </Toolbar>
    </AppBar>

      <Dialog
        open={inboxOpen}
        onClose={() => setInboxOpen(false)}
        fullWidth
        maxWidth="md"
        PaperProps={{ sx: { height: "80vh" } }}
      >
        <DialogTitle
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            py: 1.5,
            borderBottom: "1px solid",
            borderColor: "grey.200",
          }}
        >
          Messages
          <IconButton onClick={() => setInboxOpen(false)} size="small" sx={{ color: "grey.500" }} aria-label="Close messages">
            <CloseRoundedIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ p: 2, overflowY: "auto" }}>
          {inboxOpen ? (
            <ChatInboxPage
              hideHeader
              onSelectRoom={(roomId) => {
                setSelectedRoomId(roomId);
                setInboxOpen(false);
              }}
            />
          ) : null}
        </DialogContent>
      </Dialog>

      <ChatDrawer
        open={!!selectedRoomId}
        onClose={() => {
          setSelectedRoomId(null);
          void refreshUnread();
        }}
        roomId={selectedRoomId ?? undefined}
        currentUserId={userId}
      />
    </>
  );
}

export { NAV_LINKS as BUYSELL_NAV_LINKS, MOBILE_EXTRA_LINKS };
