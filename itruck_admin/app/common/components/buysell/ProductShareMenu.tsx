"use client";

import { useCallback, useState } from "react";
import Button from "@mui/material/Button";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import IconButton from "@mui/material/IconButton";
import Typography from "@mui/material/Typography";
import Divider from "@mui/material/Divider";
import Tooltip from "@mui/material/Tooltip";
import ShareOutlinedIcon from "@mui/icons-material/ShareOutlined";
import WhatsAppIcon from "@mui/icons-material/WhatsApp";
import FacebookIcon from "@mui/icons-material/Facebook";
import InstagramIcon from "@mui/icons-material/Instagram";
import LinkOutlinedIcon from "@mui/icons-material/LinkOutlined";
import { PRODUCT_THEME as T } from "@/lib/theme";
import { useNotification } from "@/hooks/useNotification";

type ProductShareMenuProps = {
  productTitle: string;
  shareUrl?: string;
  trigger?: "button" | "icon";
};

export function ProductShareMenu({
  productTitle,
  shareUrl,
  trigger = "button",
}: ProductShareMenuProps) {
  const { notify } = useNotification();
  const [shareAnchor, setShareAnchor] = useState<null | HTMLElement>(null);
  const shareOpen = Boolean(shareAnchor);

  const url = shareUrl ?? (typeof window !== "undefined" ? window.location.href : "");
  const shareText = productTitle.trim() || "Vehicle listing";

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
      await handleCopyLink();
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
      /* deep link failed silently */
    }
    const w = window.open("https://www.instagram.com", "_blank", "noopener,noreferrer");
    if (w) w.opener = null;
  }, [url, notify, handleShareClose]);

  const menu = (
    <Menu
      anchorEl={shareAnchor}
      open={shareOpen}
      onClose={handleShareClose}
      anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
      transformOrigin={{ vertical: "top", horizontal: "left" }}
      slotProps={{ paper: { sx: { minWidth: 200, mt: 0.5 } } }}
    >
      <MenuItem onClick={() => void handleNativeShare()} sx={{ gap: 1.5, py: 1 }}>
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
      <MenuItem onClick={() => void handleInstagram()} sx={{ gap: 1.5, py: 1 }}>
        <InstagramIcon sx={{ fontSize: 22, color: "#E4405F" }} />
        <Typography sx={{ fontSize: 14, fontWeight: 500 }}>Instagram</Typography>
      </MenuItem>
      <Divider sx={{ my: 0.5 }} />
      <MenuItem onClick={() => void handleCopyLink()} sx={{ gap: 1.5, py: 1 }}>
        <LinkOutlinedIcon sx={{ fontSize: 20, color: T.color.textSecondary }} />
        <Typography sx={{ fontSize: 14, fontWeight: 500 }}>Copy Link</Typography>
      </MenuItem>
    </Menu>
  );

  if (trigger === "icon") {
    return (
      <>
        <Tooltip title="Share this listing">
          <IconButton onClick={handleShareOpen} size="small" sx={{ color: T.color.textSecondary }}>
            <ShareOutlinedIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        {menu}
      </>
    );
  }

  return (
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
      {menu}
    </>
  );
}
