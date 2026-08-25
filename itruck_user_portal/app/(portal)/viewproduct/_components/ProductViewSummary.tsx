"use client";

import { useCallback, useState } from "react";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import IconButton from "@mui/material/IconButton";
import Divider from "@mui/material/Divider";
import CircularProgress from "@mui/material/CircularProgress";
import LocationOnOutlinedIcon from "@mui/icons-material/LocationOnOutlined";
import ShareOutlinedIcon from "@mui/icons-material/ShareOutlined";
import WhatsAppIcon from "@mui/icons-material/WhatsApp";
import FacebookIcon from "@mui/icons-material/Facebook";
import InstagramIcon from "@mui/icons-material/Instagram";
import LinkOutlinedIcon from "@mui/icons-material/LinkOutlined";
import FavoriteBorderIcon from "@mui/icons-material/FavoriteBorder";
import FavoriteIcon from "@mui/icons-material/Favorite";
import { PRODUCT_THEME as T, INFO } from "@/lib/theme";
import { formatProductPrice } from "@/app/common/components/buysell/utils";
import { ProductStatusChip } from "@/app/admin/portal/buysell/_components/ProductStatusChip";
import { useNotification } from "@/hooks/useNotification";
import type { BuySellProductStatus } from "@/model/services/buysellapi";

type ProductViewSummaryProps = {
  title: string;
  subtitle?: string;
  price: number;
  status?: BuySellProductStatus;
  location?: string;
  viewCount?: number;
  offerCount?: number;
  year?: string;
  wishlisted?: boolean;
  favoriteBusy?: boolean;
  onFavoriteToggle?: () => void;
  shareUrl?: string;
  productTitle?: string;
  vehicleIdLabel?: string;
};

function StatPill({ label, value }: { label: string; value: string | number }) {
  return (
    <Box sx={{ textAlign: "center", minWidth: 64 }}>
      <Typography sx={{ fontSize: 11, color: T.color.textMuted, mb: 0.25 }}>{label}</Typography>
      <Typography sx={{ fontSize: 14, fontWeight: 700, color: T.color.textPrimary }}>{value}</Typography>
    </Box>
  );
}

export function ProductViewSummary({
  title,
  subtitle,
  price,
  status,
  location,
  viewCount,
  offerCount = 0,
  year,
  wishlisted = false,
  favoriteBusy = false,
  onFavoriteToggle,
  shareUrl,
  productTitle,
  vehicleIdLabel,
}: ProductViewSummaryProps) {
  const { notify } = useNotification();
  const [shareAnchor, setShareAnchor] = useState<null | HTMLElement>(null);
  const shareOpen = Boolean(shareAnchor);

  const shareText = productTitle ?? title;
  const url = shareUrl ?? (typeof window !== "undefined" ? window.location.href : "");

  const handleShareOpen = useCallback((e: React.MouseEvent<HTMLElement>) => {
    setShareAnchor(e.currentTarget);
  }, []);

  const handleShareClose = useCallback(() => {
    setShareAnchor(null);
  }, []);

  const openWindow = useCallback((href: string) => {
    if (typeof window === "undefined") return;
    const w = window.open(href, "_blank", "noopener,noreferrer,width=600,height=500");
    if (w) w.opener = null;
  }, []);

  const handleWhatsApp = useCallback(() => {
    handleShareClose();
    const encoded = encodeURIComponent(`${shareText}\n${url}`);
    openWindow(`https://wa.me/?text=${encoded}`);
  }, [shareText, url, openWindow, handleShareClose]);

  const handleFacebook = useCallback(() => {
    handleShareClose();
    openWindow(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`);
  }, [url, openWindow, handleShareClose]);

  const handleCopyLink = useCallback(async () => {
    handleShareClose();
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      try {
        await navigator.clipboard.writeText(url);
        notify({ type: "success", message: "Link copied!" });
      } catch {
        notify({ type: "error", message: "Failed to copy link." });
      }
    }
  }, [url, notify, handleShareClose]);

  const handleNativeShare = useCallback(async () => {
    handleShareClose();
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ title: shareText, url });
      } catch {
        /* user cancelled */
      }
    } else {
      handleCopyLink();
    }
  }, [shareText, url, handleShareClose, handleCopyLink]);

  const handleInstagram = useCallback(async () => {
    handleShareClose();
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      try {
        await navigator.clipboard.writeText(url);
        notify({ type: "success", message: "Link copied! You can paste it once Instagram opens" });
      } catch {
        /* clipboard unavailable */
      }
    }
    if (typeof window === "undefined") return;
    try {
      const iframe = document.createElement("iframe");
      iframe.style.display = "none";
      iframe.src = "instagram://app";
      document.body.appendChild(iframe);
      setTimeout(() => {
        if (document.body.contains(iframe)) document.body.removeChild(iframe);
      }, 1500);
    } catch {
      /* deep link failed silently; ignore and fall through to website */
    }
    const w = window.open("https://www.instagram.com", "_blank", "noopener,noreferrer");
    if (w) w.opener = null;
  }, [url, notify, handleShareClose]);

  const showShare = Boolean(shareUrl || (typeof window !== "undefined" && window.location.href));

  return (
    <Box
      sx={{
        mb: 2.5,
        pb: 2.5,
        borderBottom: `1px solid ${T.color.border}`,
      }}
    >
      {vehicleIdLabel ? (
        <Typography
          sx={{
            color: T.color.textSecondary,
            fontSize: 14,
            mb: 0.5,
          }}
        >
          {vehicleIdLabel}
        </Typography>
      ) : null}

      <Typography
        sx={{
          fontWeight: 800,
          fontSize: { xs: 26, md: 30 },
          color: "#16a34a",
          letterSpacing: "-0.02em",
          mb: 1.25,
        }}
      >
        {formatProductPrice(price)}
      </Typography>

      {location ? (
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, mb: 1.5 }}>
          <LocationOnOutlinedIcon sx={{ fontSize: 18, color: INFO }} />
          <Typography sx={{ fontSize: 14, fontWeight: 600, color: T.color.textSecondary }}>{location}</Typography>
        </Box>
      ) : null}

      <Box
        sx={{
          display: "flex",
          flexWrap: "wrap",
          gap: { xs: 2, sm: 3 },
          mb: 2,
          py: 1.25,
          px: 0.5,
        }}
      >
        <StatPill label="Views" value={viewCount != null ? viewCount.toLocaleString("en-IN") : "—"} />
        <StatPill label="Offers" value={offerCount} />
        <StatPill label="Year" value={year ?? "—"} />
      </Box>

      <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
        {showShare ? (
          <>
            <Button
              variant="outlined"
              size="small"
              startIcon={<ShareOutlinedIcon />}
              onClick={handleShareOpen}
              sx={{ textTransform: "none", fontWeight: 600, borderColor: T.color.border }}
            >
              Share
            </Button>
            <Menu
              anchorEl={shareAnchor}
              open={shareOpen}
              onClose={handleShareClose}
              anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
              transformOrigin={{ vertical: "top", horizontal: "left" }}
              slotProps={{ paper: { sx: { minWidth: 200, mt: 0.5 } } }}
            >
              <MenuItem onClick={handleNativeShare} sx={{ gap: 1.5, py: 1 }}>
                <ShareOutlinedIcon sx={{ fontSize: 20, color: T.color.textSecondary }} />
                <Typography sx={{ fontSize: 14, fontWeight: 500 }}>Share via&hellip;</Typography>
              </MenuItem>
              <Divider sx={{ my: 0.5 }} />
              <MenuItem onClick={handleWhatsApp} sx={{ gap: 1.5, py: 1 }}>
                <WhatsAppIcon sx={{ fontSize: 22, color: "#25D366" }} />
                <Typography sx={{ fontSize: 14, fontWeight: 500 }}>WhatsApp</Typography>
              </MenuItem>
              <MenuItem onClick={handleFacebook} sx={{ gap: 1.5, py: 1 }}>
                <FacebookIcon sx={{ fontSize: 22, color: "#1877F2" }} />
                <Typography sx={{ fontSize: 14, fontWeight: 500 }}>Facebook</Typography>
              </MenuItem>
              <MenuItem onClick={handleInstagram} sx={{ gap: 1.5, py: 1 }}>
                <InstagramIcon sx={{ fontSize: 22, color: "#E4405F" }} />
                <Typography sx={{ fontSize: 14, fontWeight: 500 }}>Instagram</Typography>
              </MenuItem>
              <Divider sx={{ my: 0.5 }} />
              <MenuItem onClick={handleCopyLink} sx={{ gap: 1.5, py: 1 }}>
                <LinkOutlinedIcon sx={{ fontSize: 20, color: T.color.textSecondary }} />
                <Typography sx={{ fontSize: 14, fontWeight: 500 }}>Copy Link</Typography>
              </MenuItem>
            </Menu>
          </>
        ) : null}
        {onFavoriteToggle ? (
          <Button
            variant="outlined"
            size="small"
            disabled={favoriteBusy}
            startIcon={
              favoriteBusy ? (
                <CircularProgress size={14} />
              ) : wishlisted ? (
                <FavoriteIcon sx={{ color: T.color.danger }} />
              ) : (
                <FavoriteBorderIcon />
              )
            }
            onClick={onFavoriteToggle}
            sx={{
              textTransform: "none",
              fontWeight: 600,
              borderColor: wishlisted ? T.color.danger : T.color.border,
              color: wishlisted ? T.color.danger : undefined,
            }}
          >
            {wishlisted ? "Wishlisted" : "Wishlist"}
          </Button>
        ) : null}
      </Box>
    </Box>
  );
}
