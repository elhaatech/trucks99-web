"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import Box from "@mui/material/Box";
import Dialog from "@mui/material/Dialog";
import IconButton from "@mui/material/IconButton";
import Typography from "@mui/material/Typography";
import CloseIcon from "@mui/icons-material/Close";
import { GoogleAd } from "./GoogleAd";
import { ADSENSE_SLOTS } from "./adsConfig";
import { isGoogleAdEligiblePage } from "./googleAdPages";
import {
  markPopupDismissedThisSession,
  preparePopupSession,
  wasPopupDismissedThisSession,
} from "./googleAdSession";

const POPUP_DELAY_MS = 600;

export function GoogleAdPopup() {
  const pathname = usePathname();
  const eligible = isGoogleAdEligiblePage(pathname) && Boolean(ADSENSE_SLOTS.popup);
  const [open, setOpen] = useState(false);
  const [adReady, setAdReady] = useState(false);
  const [adKey, setAdKey] = useState(0);
  const timerRef = useRef<number | null>(null);

  const clearTimer = useCallback(() => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const handleClose = useCallback(() => {
    clearTimer();
    setOpen(false);
    setAdReady(false);
    markPopupDismissedThisSession(pathname);
  }, [clearTimer, pathname]);

  const handleDialogEntered = useCallback(() => {
    setAdKey((key) => key + 1);
    setAdReady(true);
  }, []);

  const handleDialogExited = useCallback(() => {
    setAdReady(false);
  }, []);

  useEffect(() => {
    clearTimer();
    setOpen(false);
    setAdReady(false);

    if (!eligible) return;

    preparePopupSession(pathname);
    if (wasPopupDismissedThisSession(pathname)) return;

    timerRef.current = window.setTimeout(() => {
      if (wasPopupDismissedThisSession(pathname)) return;
      setOpen(true);
    }, POPUP_DELAY_MS);

    return clearTimer;
  }, [eligible, pathname, clearTimer]);

  if (!eligible) return null;

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
      aria-labelledby="google-ad-popup-title"
      slotProps={{
        backdrop: {
          sx: { backgroundColor: "rgba(15, 23, 42, 0.6)" },
        },
        transition: {
          onEntered: handleDialogEntered,
          onExited: handleDialogExited,
        },
      }}
      PaperProps={{
        sx: {
          position: "relative",
          borderRadius: { xs: 2, sm: 3 },
          mx: { xs: 1.5, sm: 2 },
          width: { xs: "calc(100% - 24px)", sm: "100%" },
          maxWidth: 520,
          overflow: "visible",
        },
      }}
    >
      <IconButton
        aria-label="Close advertisement"
        onClick={handleClose}
        sx={{
          position: "absolute",
          top: { xs: 6, sm: 8 },
          right: { xs: 6, sm: 8 },
          zIndex: 2,
          bgcolor: "background.paper",
          boxShadow: 1,
          "&:hover": { bgcolor: "grey.100" },
        }}
      >
        <CloseIcon fontSize="small" />
      </IconButton>

      <Box sx={{ px: { xs: 2, sm: 3 }, pt: { xs: 5, sm: 5.5 }, pb: { xs: 2, sm: 3 } }}>
        <Typography
          id="google-ad-popup-title"
          variant="caption"
          color="text.secondary"
          sx={{
            display: "block",
            mb: 1.5,
            textTransform: "uppercase",
            letterSpacing: 0.6,
          }}
        >
          Sponsored
        </Typography>
        {adReady ? (
          <GoogleAd
            key={`popup-ad-${pathname}-${adKey}`}
            placement="popup"
            variant="popup"
            enabled
          />
        ) : (
          <Box
            sx={{
              width: "100%",
              minHeight: { xs: 250, sm: 280 },
              bgcolor: "grey.50",
              borderRadius: 1,
              border: "1px dashed",
              borderColor: "divider",
            }}
          />
        )}
      </Box>
    </Dialog>
  );
}
