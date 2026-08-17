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
import InputBase from "@mui/material/InputBase";
import Avatar from "@mui/material/Avatar";
import FavoriteBorderIcon from "@mui/icons-material/FavoriteBorder";
import MenuIcon from "@mui/icons-material/Menu";
import SearchIcon from "@mui/icons-material/Search";
import LocalShippingOutlinedIcon from "@mui/icons-material/LocalShippingOutlined";
import { INFO, LAYOUT, PRODUCT_THEME as T } from "@/lib/theme";
import { userProductRoutes } from "@/lib/userProductRoutes";
import { getCurrentUser, type User } from "@/model/services/user";
import { getBuySellFavoriteCount } from "@/model/services/favoriteapi";

const NAV_LINKS = [
  { label: "Buy Vehicle", href: userProductRoutes.list() },
  { label: "My Listings", href: userProductRoutes.sellVehicle() },
  { label: "My Favorite List", href: userProductRoutes.favorites() },
];

type BuySellHeaderProps = {
  onMobileMenuToggle?: () => void;
};

export function BuySellHeader({ onMobileMenuToggle }: BuySellHeaderProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<User | null>(null);
  const [favoriteCount, setFavoriteCount] = useState(0);
  const [userMenuAnchor, setUserMenuAnchor] = useState<null | HTMLElement>(null);
  const [headerSearch, setHeaderSearch] = useState("");

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
    getCurrentUser()
      .then(setUser)
      .catch(() => setUser(null));
  }, []);

  useEffect(() => {
    refreshCounts();
  }, [refreshCounts, pathname]);

  const handleHeaderSearch = () => {
    router.push(
      userProductRoutes.list(headerSearch.trim() ? { q: headerSearch.trim() } : undefined),
    );
  };

  const isLinkActive = (link: { label: string; href: string }) => {
    if (link.label === "My Listings") {
      return (
        pathname.startsWith("/usear/product/my-listings") ||
        pathname.startsWith("/usear/product/create") ||
        pathname.startsWith("/usear/product/edit")
      );
    }
    if (link.label === "My Favorite List") {
      return pathname === userProductRoutes.favorites() || pathname === userProductRoutes.cart();
    }
    return pathname === link.href || pathname.startsWith(`${link.href}/`);
  };

  return (
    <AppBar
      position="static"
      elevation={0}
      sx={{
        bgcolor: T.color.surface,
        color: T.color.textPrimary,
        borderBottom: `1px solid ${T.color.border}`,
        boxShadow: "0 1px 0 rgba(15,23,42,0.04)",
      }}
    >
      <Toolbar
        sx={{
          minHeight: LAYOUT.navbarHeight,
          width: "100%",
          px: { xs: 2, sm: 3, lg: 4 },
          gap: { xs: 1, md: 2 },
        }}
      >
        <IconButton
          edge="start"
          sx={{ display: { lg: "none" } }}
          onClick={onMobileMenuToggle}
          aria-label="Open menu"
        >
          <MenuIcon />
        </IconButton>

        <Box
          sx={{ display: "flex", alignItems: "center", gap: 1, cursor: "pointer", flexShrink: 0 }}
          onClick={() => router.push(userProductRoutes.dashboard())}
        >
          <LocalShippingOutlinedIcon sx={{ color: INFO, fontSize: 28 }} />
          <Typography sx={{ fontWeight: 800, fontSize: 18, color: INFO, letterSpacing: "-0.02em" }}>
            TRUCKS99
          </Typography>
        </Box>

        <Box sx={{ display: { xs: "none", lg: "flex" }, gap: 0.25, ml: 1 }}>
          {NAV_LINKS.map((link) => {
            const active = isLinkActive(link);
            const showFavoriteBadge = link.label === "My Favorite List" && favoriteCount > 0;
            return (
              <Button
                key={link.href}
                onClick={() => router.push(link.href)}
                sx={{
                  textTransform: "none",
                  fontWeight: active ? 700 : 500,
                  color: active ? INFO : T.color.textSecondary,
                  fontSize: 13.5,
                  px: 1.25,
                  minWidth: "auto",
                  gap: 0.75,
                }}
              >
                {link.label === "My Favorite List" ? (
                  <FavoriteBorderIcon sx={{ fontSize: 18, color: active ? INFO : T.color.textSecondary }} />
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
                      bgcolor: INFO,
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

        <Box
          component="form"
          onSubmit={(e) => {
            e.preventDefault();
            handleHeaderSearch();
          }}
          sx={{
            display: { xs: "none", md: "flex" },
            alignItems: "center",
            flex: 1,
            maxWidth: 360,
            mx: "auto",
            px: 1.5,
            py: 0.6,
            borderRadius: "999px",
            border: `1px solid ${T.color.border}`,
            bgcolor: T.color.surfaceMuted,
          }}
        >
          <SearchIcon sx={{ color: T.color.textMuted, fontSize: 20, mr: 0.5 }} />
          <InputBase
            placeholder="Search vehicles…"
            value={headerSearch}
            onChange={(e) => setHeaderSearch(e.target.value)}
            sx={{ flex: 1, fontSize: 14 }}
          />
        </Box>

        <Box sx={{ display: "flex", alignItems: "center", gap: 0.25, ml: "auto" }}>
          <Button
            onClick={() => router.push(userProductRoutes.favorites())}
            aria-label="My Favorite List"
            sx={{
              display: { lg: "none" },
              textTransform: "none",
              fontWeight: pathname === userProductRoutes.favorites() ? 700 : 500,
              color: pathname === userProductRoutes.favorites() ? INFO : T.color.textSecondary,
              fontSize: 13,
              minWidth: "auto",
              px: 1,
            }}
            startIcon={
              <Badge badgeContent={favoriteCount} color="primary" max={99}>
                <FavoriteBorderIcon sx={{ fontSize: 20 }} />
              </Badge>
            }
          >
            My Favorite List
          </Button>

          {user ? (
            <>
              <Button
                onClick={(e) => setUserMenuAnchor(e.currentTarget)}
                sx={{
                  textTransform: "none",
                  fontWeight: 600,
                  ml: 0.5,
                  gap: 1,
                  color: T.color.textPrimary,
                }}
              >
                <Typography sx={{ display: { xs: "none", sm: "block" }, fontSize: 14 }}>
                  {user.name || "Account"}
                </Typography>
                <Avatar sx={{ width: 32, height: 32, bgcolor: INFO, fontSize: 14 }}>
                  {(user.name || "U").charAt(0).toUpperCase()}
                </Avatar>
              </Button>
              <Menu
                anchorEl={userMenuAnchor}
                open={Boolean(userMenuAnchor)}
                onClose={() => setUserMenuAnchor(null)}
              >
                <MenuItem
                  onClick={() => {
                    setUserMenuAnchor(null);
                    router.push(userProductRoutes.dashboard());
                  }}
                >
                  Dashboard
                </MenuItem>
                <MenuItem
                  onClick={() => {
                    setUserMenuAnchor(null);
                    router.push(userProductRoutes.sellVehicle());
                  }}
                >
                  My Listings
                </MenuItem>
                <MenuItem
                  onClick={() => {
                    setUserMenuAnchor(null);
                    router.push(userProductRoutes.favorites());
                  }}
                >
                  My Favorite List
                </MenuItem>
                <MenuItem
                  onClick={() => {
                    setUserMenuAnchor(null);
                    router.push(userProductRoutes.offers());
                  }}
                >
                  My Offers
                </MenuItem>
                <MenuItem
                  onClick={() => {
                    setUserMenuAnchor(null);
                    router.push(userProductRoutes.purchases());
                  }}
                >
                  My Purchases
                </MenuItem>
              </Menu>
            </>
          ) : (
            <Button
              variant="contained"
              size="small"
              onClick={() => router.push("/")}
              sx={{ bgcolor: INFO, ml: 0.5, textTransform: "none", fontWeight: 600 }}
            >
              Login
            </Button>
          )}
        </Box>
      </Toolbar>
    </AppBar>
  );
}

export { NAV_LINKS as BUYSELL_NAV_LINKS };
