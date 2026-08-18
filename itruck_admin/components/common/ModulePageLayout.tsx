"use client";

import * as React from "react";
import Box from "@mui/material/Box";
import Alert from "@mui/material/Alert";
import { PageContainer, PageHeader, type BreadcrumbItem } from "@/components/ui";
import { AdvertisementSlot } from "@/components/ads";

export interface ModulePageLayoutProps {
  title: string;
  subtitle?: string;
  breadcrumbs?: BreadcrumbItem[];
  backButton?: React.ReactNode;
  action?: React.ReactNode;
  error?: string;
  onErrorClose?: () => void;
  showAds?: boolean;
  children: React.ReactNode;
  maxWidth?: number | string;
}

/** Standard page shell used across all admin portal modules. */
export function ModulePageLayout({
  title,
  subtitle,
  breadcrumbs,
  backButton,
  action,
  error,
  onErrorClose,
  showAds = true,
  children,
  maxWidth,
}: ModulePageLayoutProps) {
  return (
    <PageContainer maxWidth={maxWidth}>
      <PageHeader
        title={title}
        subtitle={subtitle}
        breadcrumbs={breadcrumbs}
        backButton={backButton}
        action={action}
      />

      {error ? (
        <Alert severity="error" onClose={onErrorClose} sx={{ mb: 2.5 }}>
          {error}
        </Alert>
      ) : null}

      {showAds ? <AdvertisementSlot /> : null}

      {children}
    </PageContainer>
  );
}
