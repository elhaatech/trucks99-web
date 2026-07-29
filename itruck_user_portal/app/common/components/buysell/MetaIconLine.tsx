"use client";

import Box from "@mui/material/Box";
import Link from "@mui/material/Link";
import type { SxProps, Theme } from "@mui/material/styles";
import { PRODUCT_THEME as T, INFO } from "@/lib/theme";
import { contactTelHref, formatContactMobile } from "./utils";

type MetaIconLineProps = {
  icon: React.ReactNode;
  children: React.ReactNode;
  href?: string | null;
  dense?: boolean;
  sx?: SxProps<Theme>;
  onClick?: (e: React.MouseEvent) => void;
};

/** Consistent icon + text row for location / seller / phone meta. */
export function MetaIconLine({
  icon,
  children,
  href,
  dense = false,
  sx,
  onClick,
}: MetaIconLineProps) {
  const fontSize = dense ? 12.5 : 13.5;

  const content = href ? (
    <Link
      href={href}
      underline="hover"
      sx={{
        fontSize,
        fontWeight: 600,
        color: INFO,
        lineHeight: 1.3,
        minWidth: 0,
        overflow: "hidden",
        textOverflow: "ellipsis",
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </Link>
  ) : (
    <Box
      component="span"
      sx={{
        fontSize,
        fontWeight: 500,
        color: T.color.textSecondary,
        lineHeight: 1.3,
        minWidth: 0,
        overflow: "hidden",
        textOverflow: "ellipsis",
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </Box>
  );

  return (
    <Box
      onClick={onClick}
      sx={{
        display: "flex",
        alignItems: "center",
        gap: 0.75,
        minWidth: 0,
        color: T.color.textMuted,
        ...((sx as object) || {}),
      }}
    >
      <Box
        component="span"
        aria-hidden
        sx={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
          width: dense ? 16 : 18,
          height: dense ? 16 : 18,
          color: INFO,
          lineHeight: 0,
          "& > svg": {
            fontSize: dense ? 15 : 17,
            width: "1em",
            height: "1em",
          },
        }}
      >
        {icon}
      </Box>
      {content}
    </Box>
  );
}

type PhoneMetaLineProps = {
  mobile?: string | null;
  dense?: boolean;
  sx?: SxProps<Theme>;
  icon: React.ReactNode;
};

export function PhoneMetaLine({ mobile, dense, sx, icon }: PhoneMetaLineProps) {
  const formatted = formatContactMobile(mobile);
  if (!formatted) return null;
  return (
    <MetaIconLine
      icon={icon}
      href={contactTelHref(formatted)}
      dense={dense}
      sx={sx}
      onClick={(e) => e.stopPropagation()}
    >
      {formatted}
    </MetaIconLine>
  );
}
