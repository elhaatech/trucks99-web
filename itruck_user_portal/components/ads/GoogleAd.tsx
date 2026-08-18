"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import {
  DEFAULT_ADSENSE_SLOT,
  GOOGLE_ADS_CLIENT,
  GOOGLE_ADS_INLINE_UNIT,
  GOOGLE_ADS_POPUP_UNIT,
  getAdSenseSlot,
  isLocalDevelopmentHost,
  type AdSensePlacement,
} from "./adsConfig";

declare global {
  interface Window {
    adsbygoogle?: Record<string, unknown>[];
  }
}

export const Google_TEST_BANNER_ID = GOOGLE_ADS_INLINE_UNIT;
export const Google_TEST_POPUP_BANNER_ID = GOOGLE_ADS_POPUP_UNIT;

export type GoogleAdVariant = "inline" | "popup";
export type GoogleAdFormat = "auto" | "rectangle" | "horizontal" | "vertical";

export interface GoogleAdProps {
  slot?: string;
  placement?: AdSensePlacement;
  format?: GoogleAdFormat;
  responsive?: boolean;
  className?: string;
  enabled?: boolean;
  adUnitId?: string;
  variant?: GoogleAdVariant;
}

function parseAdUnit(adUnitId: string): { client: string; slot: string } {
  const [client, slot] = adUnitId.split("/");
  return {
    client: client || GOOGLE_ADS_CLIENT,
    slot: slot || DEFAULT_ADSENSE_SLOT,
  };
}

function resolveSlot(props: GoogleAdProps): string {
  if (props.slot?.trim()) return props.slot.trim();
  if (props.placement) return getAdSenseSlot(props.placement);
  if (props.adUnitId) return parseAdUnit(props.adUnitId).slot;
  return DEFAULT_ADSENSE_SLOT;
}

function ensureAdsenseScript(client: string): void {
  if (typeof document === "undefined") return;
  const src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${client}`;
  if (document.querySelector(`script[src*="adsbygoogle.js"]`)) return;
  const script = document.createElement("script");
  script.async = true;
  script.src = src;
  script.crossOrigin = "anonymous";
  document.head.appendChild(script);
}

export function GoogleAd({
  slot: slotProp,
  placement,
  format = "auto",
  responsive = true,
  className,
  adUnitId,
  enabled = true,
  variant = "inline",
}: GoogleAdProps) {
  const pathname = usePathname();
  const insRef = useRef<HTMLModElement | null>(null);
  const pushedRef = useRef(false);
  const [mounted, setMounted] = useState(false);
  const [showLocalNote, setShowLocalNote] = useState(false);
  const slot = resolveSlot({ slot: slotProp, placement, adUnitId });
  const client = adUnitId
    ? parseAdUnit(adUnitId).client || GOOGLE_ADS_CLIENT
    : GOOGLE_ADS_CLIENT;
  const isPopup = variant === "popup";

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    pushedRef.current = false;
    setShowLocalNote(false);
  }, [pathname, slot]);

  useEffect(() => {
    if (!enabled || !slot || !mounted) return;

    ensureAdsenseScript(client);

    let attempts = 0;
    let timer = 0;

    const tryPush = () => {
      const element = insRef.current;
      if (!element || pushedRef.current) return;
      if (element.getAttribute("data-adsbygoogle-status")) {
        pushedRef.current = true;
        return;
      }

      const width = element.getBoundingClientRect().width;
      if (width < 1 && attempts < 25) {
        attempts += 1;
        timer = window.setTimeout(tryPush, 100);
        return;
      }

      try {
        pushedRef.current = true;
        (window.adsbygoogle = window.adsbygoogle || []).push({});
      } catch {
        pushedRef.current = false;
      }
    };

    timer = window.setTimeout(tryPush, 400);

    const localNoteTimer = window.setTimeout(() => {
      const element = insRef.current;
      const filled =
        element?.getAttribute("data-adsbygoogle-status") === "done" ||
        element?.getAttribute("data-adsbygoogle-status") === "filled" ||
        Boolean(element?.querySelector("iframe"));
      if (!filled && isLocalDevelopmentHost()) {
        setShowLocalNote(true);
      }
    }, 2500);

    return () => {
      window.clearTimeout(timer);
      window.clearTimeout(localNoteTimer);
    };
  }, [enabled, slot, client, pathname, mounted]);

  if (!enabled || !slot) return null;

  return (
    <Box
      component="div"
      className={className ? `google-ad-container ${className}` : "google-ad-container"}
      sx={{
        width: "100%",
        minWidth: 250,
        minHeight: isPopup ? 250 : 280,
        display: "block",
        overflow: "visible",
        position: "relative",
        bgcolor: "#f8fafc",
        border: "1px solid #e2e8f0",
        borderRadius: 1,
      }}
    >
      {showLocalNote ? (
        <Box
          sx={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            px: 3,
            textAlign: "center",
            pointerEvents: "none",
            zIndex: 1,
          }}
        >
          <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 520, lineHeight: 1.6 }}>
            Google does not serve live ads on localhost. Slot{" "}
            <Box component="span" sx={{ fontFamily: "monospace" }}>
              {slot}
            </Box>{" "}
            is configured. Real ads appear on your published domain after AdSense approval.
          </Typography>
        </Box>
      ) : null}
      {mounted ? (
        <ins
          ref={insRef}
          className="adsbygoogle"
          style={{
            display: "block",
            width: "100%",
            minWidth: 250,
            minHeight: isPopup ? 250 : 280,
          }}
          data-ad-client={client}
          data-ad-slot={slot}
          data-ad-format={isPopup ? "rectangle" : format}
          {...(isPopup || !responsive
            ? {}
            : { "data-full-width-responsive": "true" })}
        />
      ) : (
        <Box sx={{ width: "100%", minHeight: isPopup ? 250 : 280 }} />
      )}
    </Box>
  );
}

export { ADSENSE_SLOTS } from "./adsConfig";
export type { AdSensePlacement };
