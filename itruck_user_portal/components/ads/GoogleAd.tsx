"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import {
  GOOGLE_ADS_CLIENT,
  GOOGLE_ADS_INLINE_UNIT,
  GOOGLE_ADS_POPUP_UNIT,
  shouldShowAdPlaceholder,
  shouldUseAdTestMode,
} from "./adsConfig";
import {
  initAdsenseUnit,
  isAdsenseUnitFilled,
  loadAdsenseScript,
} from "./adsenseLoader";

export const Google_TEST_BANNER_ID = GOOGLE_ADS_INLINE_UNIT;
export const Google_TEST_POPUP_BANNER_ID = GOOGLE_ADS_POPUP_UNIT;

function parseAdUnit(adUnitId: string): { client: string; slot: string } {
  const [client, slot] = adUnitId.split("/");
  return {
    client: client || GOOGLE_ADS_CLIENT,
    slot: slot || "9214589741",
  };
}

export type GoogleAdVariant = "inline" | "popup";

export interface GoogleAdProps {
  adUnitId?: string;
  className?: string;
  enabled?: boolean;
  /** Popup uses fixed rectangle size — fills better inside modals. */
  variant?: GoogleAdVariant;
}

function AdPlaceholder() {
  return (
    <Box
      sx={{
        position: "absolute",
        inset: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
        px: 2,
        bgcolor: "grey.100",
        borderRadius: 1,
        border: "1px dashed",
        borderColor: "divider",
        pointerEvents: "none",
        zIndex: 1,
      }}
    >
      <Typography variant="body2" color="text.secondary">
        Google Ad Placeholder (Development Mode)
      </Typography>
    </Box>
  );
}

export function GoogleAd({
  adUnitId = Google_TEST_BANNER_ID,
  enabled = true,
  variant = "inline",
}: GoogleAdProps) {
  const pathname = usePathname();
  const insRef = useRef<HTMLModElement | null>(null);
  const initGenerationRef = useRef(0);
  const [showPlaceholder, setShowPlaceholder] = useState(false);
  const { client, slot } = parseAdUnit(adUnitId);
  const isPopup = variant === "popup";
  const useAdTest = shouldUseAdTestMode();
  const allowPlaceholder = shouldShowAdPlaceholder();

  useEffect(() => {
    if (!enabled) {
      setShowPlaceholder(false);
      return;
    }

    const element = insRef.current;
    if (!element) return;

    const generation = ++initGenerationRef.current;
    let cancelled = false;

    element.dataset.adsenseInitialized = "false";
    element.removeAttribute("data-adsbygoogle-status");
    setShowPlaceholder(false);

    const run = async () => {
      try {
        await loadAdsenseScript(client);

        if (isPopup) {
          await new Promise<void>((resolve) => {
            window.setTimeout(resolve, 150);
          });
        }

        if (cancelled || generation !== initGenerationRef.current) return;

        await initAdsenseUnit(element, client);

        if (cancelled || generation !== initGenerationRef.current) return;

        if (allowPlaceholder) {
          window.setTimeout(() => {
            if (cancelled || generation !== initGenerationRef.current) return;
            if (!isAdsenseUnitFilled(element)) {
              setShowPlaceholder(true);
            }
          }, 2500);
        }
      } catch {
        if (!cancelled && generation === initGenerationRef.current && allowPlaceholder) {
          setShowPlaceholder(true);
        }
      }
    };

    void run();

    return () => {
      cancelled = true;
    };
  }, [enabled, client, slot, pathname, adUnitId, isPopup, allowPlaceholder, useAdTest]);

  if (!enabled) return null;

  return (
    <Box
      component="div"
      className="google-ad-container"
      sx={{
        width: "100%",
        minWidth: isPopup ? { xs: 280, sm: 400 } : { xs: 280, sm: 320 },
        minHeight: isPopup ? { xs: 250, sm: 280 } : { xs: 90, sm: 120 },
        display: "flex",
        justifyContent: "center",
        alignItems: "stretch",
        position: "relative",
        overflow: "visible",
        visibility: "visible",
        opacity: 1,
        ...(isPopup
          ? {}
          : {
              border: "1px dashed",
              borderColor: "divider",
              borderRadius: 1,
              bgcolor: "grey.50",
            }),
      }}
    >
      {showPlaceholder ? <AdPlaceholder /> : null}
      <ins
        ref={insRef}
        className="adsbygoogle"
        style={
          isPopup
            ? {
                display: "block",
                width: "100%",
                height: 280,
                minHeight: 250,
                visibility: "visible",
              }
            : {
                display: "block",
                width: "100%",
                minHeight: 90,
                visibility: "visible",
              }
        }
        data-ad-client={client}
        data-ad-slot={slot}
        {...(useAdTest ? { "data-adtest": "on" } : {})}
        {...(isPopup
          ? { "data-ad-format": "rectangle" }
          : {
              "data-ad-format": "auto",
              "data-full-width-responsive": "true",
            })}
      />
    </Box>
  );
}
