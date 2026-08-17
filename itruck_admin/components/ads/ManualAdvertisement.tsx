"use client";

import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Chip from "@mui/material/Chip";
import type { Advertisement } from "@/model/api";
import {
  isVideoMedia,
  resolveMediaUrl,
} from "./adHelpers";

export interface ManualAdvertisementProps {
  ad: Advertisement;
}

function AdShell({
  ad,
  children,
}: {
  ad: Advertisement;
  children: React.ReactNode;
}) {
  const href = ad.redirectUrl?.trim();
  const content = (
    <Box
      sx={{
        border: "1px solid",
        borderColor: "divider",
        borderRadius: 2,
        overflow: "hidden",
        bgcolor: "background.paper",
        transition: "box-shadow 0.2s ease",
        "&:hover": href ? { boxShadow: 2 } : undefined,
      }}
    >
      {children}
    </Box>
  );

  if (!href) return content;

  return (
    <Box
      component="a"
      href={href}
      target="_blank"
      rel="noopener noreferrer sponsored"
      sx={{ display: "block", textDecoration: "none", color: "inherit" }}
    >
      {content}
    </Box>
  );
}

export function ManualAdvertisement({ ad }: ManualAdvertisementProps) {
  const mediaSrc = resolveMediaUrl(ad.mediaUrl || "");
  const isVideo = isVideoMedia(ad.adType, ad.mediaUrl);

  if (ad.adType === "Text") {
    return (
      <AdShell ad={ad}>
        <Box sx={{ p: { xs: 1.5, sm: 2 } }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.5 }}>
            <Chip label="Sponsored" size="small" variant="outlined" />
            <Typography variant="caption" color="text.secondary">
              {ad.clientName}
            </Typography>
          </Box>
          <Typography variant="subtitle1" fontWeight={700}>
            {ad.adTitle}
          </Typography>
          {ad.description ? (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              {ad.description}
            </Typography>
          ) : null}
        </Box>
      </AdShell>
    );
  }

  if (ad.adType === "Banner" || ad.adType === "Image") {
    return (
      <AdShell ad={ad}>
        {mediaSrc ? (
          <Box
            component="img"
            src={mediaSrc}
            alt={ad.adTitle || "Advertisement"}
            sx={{
              width: "100%",
              maxHeight: { xs: 180, sm: 220, md: 260 },
              objectFit: "contain",
              display: "block",
              bgcolor: "grey.50",
            }}
          />
        ) : (
          <Box sx={{ p: 2 }}>
            <Typography variant="subtitle2" fontWeight={700}>
              {ad.adTitle}
            </Typography>
            {ad.description ? (
              <Typography variant="body2" color="text.secondary">
                {ad.description}
              </Typography>
            ) : null}
          </Box>
        )}
      </AdShell>
    );
  }

  if (ad.adType === "Video") {
    return (
      <AdShell ad={ad}>
        {mediaSrc && isVideo ? (
          <Box
            component="video"
            src={mediaSrc}
            controls
            muted
            playsInline
            sx={{
              width: "100%",
              maxHeight: { xs: 200, sm: 260, md: 320 },
              display: "block",
              bgcolor: "grey.900",
            }}
          />
        ) : mediaSrc ? (
          <Box
            component="img"
            src={mediaSrc}
            alt={ad.adTitle || "Advertisement"}
            sx={{
              width: "100%",
              maxHeight: { xs: 180, sm: 220 },
              objectFit: "contain",
              display: "block",
            }}
          />
        ) : (
          <Box sx={{ p: 2 }}>
            <Typography variant="subtitle2">{ad.adTitle}</Typography>
          </Box>
        )}
      </AdShell>
    );
  }

  return null;
}
