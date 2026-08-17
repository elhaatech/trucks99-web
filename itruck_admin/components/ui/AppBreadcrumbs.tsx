"use client";

import * as React from "react";
import Breadcrumbs from "@mui/material/Breadcrumbs";
import Link from "@mui/material/Link";
import Typography from "@mui/material/Typography";
import NavigateNextIcon from "@mui/icons-material/NavigateNext";
import NextLink from "next/link";

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

export interface AppBreadcrumbsProps {
  items: BreadcrumbItem[];
}

export function AppBreadcrumbs({ items }: AppBreadcrumbsProps) {
  return (
    <Breadcrumbs
      separator={<NavigateNextIcon fontSize="small" sx={{ color: "text.disabled" }} />}
      aria-label="breadcrumb"
      sx={{ mb: 1.5 }}
    >
      {items.map((item, index) => {
        const isLast = index === items.length - 1;

        if (isLast || !item.href) {
          return (
            <Typography
              key={item.label}
              variant="body2"
              color={isLast ? "text.primary" : "text.secondary"}
              fontWeight={isLast ? 600 : 400}
            >
              {item.label}
            </Typography>
          );
        }

        return (
          <Link
            key={item.label}
            component={NextLink}
            href={item.href}
            prefetch={false}
            underline="hover"
            variant="body2"
            color="text.secondary"
            sx={{
              fontWeight: 400,
              transition: "color 150ms ease",
              "&:hover": { color: "primary.main" },
            }}
          >
            {item.label}
          </Link>
        );
      })}
    </Breadcrumbs>
  );
}
