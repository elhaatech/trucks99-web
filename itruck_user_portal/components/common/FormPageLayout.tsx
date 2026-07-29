"use client";

import * as React from "react";
import Box from "@mui/material/Box";
import { PageContainer, PageHeader, type BreadcrumbItem } from "@/components/ui";
import { PageSection } from "@/components/ui";

export interface FormPageLayoutProps {
  title: string;
  subtitle?: string;
  breadcrumbs?: BreadcrumbItem[];
  backButton?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

/** Standard layout for create/edit form pages. */
export function FormPageLayout({
  title,
  subtitle,
  breadcrumbs,
  backButton,
  children,
  footer,
}: FormPageLayoutProps) {
  return (
    <PageContainer maxWidth={960}>
      <PageHeader
        title={title}
        subtitle={subtitle}
        breadcrumbs={breadcrumbs}
        backButton={backButton}
      />
      <PageSection>{children}</PageSection>
      {footer}
    </PageContainer>
  );
}

export function FormGrid({ children }: { children: React.ReactNode }) {
  return (
    <Box
      sx={{
        display: "grid",
        gridTemplateColumns: { xs: "1fr", sm: "repeat(2, minmax(0, 1fr))" },
        gap: 2.5,
        alignItems: "start",
      }}
    >
      {children}
    </Box>
  );
}

export function FormGridFull({ children }: { children: React.ReactNode }) {
  return <Box sx={{ gridColumn: "1 / -1" }}>{children}</Box>;
}
