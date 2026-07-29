"use client";

import * as React from "react";
import Card, { type CardProps } from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import CardActions from "@mui/material/CardActions";
import { alpha, useTheme } from "@mui/material/styles";

export interface AppCardProps extends CardProps {
  hover?: boolean;
  accentColor?: string;
  accentTop?: boolean;
  padding?: number;
  actions?: React.ReactNode;
}

export function AppCard({
  hover = false,
  accentColor,
  accentTop = false,
  padding = 3,
  actions,
  children,
  sx,
  ...rest
}: AppCardProps) {
  const theme = useTheme();
  const accent = accentColor ?? theme.palette.primary.main;

  return (
    <Card
      sx={{
        position: "relative",
        overflow: "hidden",
        transition: `box-shadow ${theme.tokens.transition.normal}, transform ${theme.tokens.transition.normal}, border-color ${theme.tokens.transition.normal}`,
        ...(hover && {
          cursor: "pointer",
          "&:hover": {
            boxShadow: theme.tokens.shadow.cardHover,
            transform: "translateY(-2px)",
            borderColor: alpha(accent, 0.25),
          },
        }),
        ...(accentTop && {
          "&::before": {
            content: '""',
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: 3,
            background: accent,
          },
        }),
        ...sx,
      }}
      {...rest}
    >
      <CardContent sx={{ p: padding, "&:last-child": { pb: actions ? 2 : padding } }}>
        {children}
      </CardContent>
      {actions ? (
        <CardActions sx={{ px: padding, pb: padding, pt: 0, gap: 1 }}>
          {actions}
        </CardActions>
      ) : null}
    </Card>
  );
}
