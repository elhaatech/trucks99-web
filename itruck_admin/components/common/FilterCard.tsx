"use client";

import * as React from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";
import FilterListIcon from "@mui/icons-material/FilterList";
import { alpha } from "@mui/material/styles";
import FormTextField, { type FormTextFieldProps } from "./Formtextfield";
import FormSelectField, { type FormSelectFieldProps } from "./Formselectfield";

export interface FilterCardProps {
  title?: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  onSearch?: () => void;
  onClear?: () => void;
  disabled?: boolean;
  clearDisabled?: boolean;
  searchLabel?: string;
  clearLabel?: string;
}

export function FilterCard({
  title = "Filters",
  subtitle,
  children,
  footer,
  onSearch,
  onClear,
  disabled,
  clearDisabled,
  searchLabel,
  clearLabel,
}: FilterCardProps) {
  return (
    <Paper
      elevation={0}
      sx={{
        borderRadius: "12px",
        border: "1px solid",
        borderColor: "divider",
        bgcolor: "background.paper",
        p: { xs: 2, sm: 2.5 },
        mb: 3,
        boxShadow: (t) => t.tokens.shadow.card,
      }}
    >
      {(title || subtitle) && (
        <Box
          sx={{
            mb: 2,
            display: "flex",
            alignItems: "flex-start",
            gap: 1.25,
          }}
        >
          <Box
            sx={{
              width: 36,
              height: 36,
              borderRadius: "10px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              bgcolor: (t) => alpha(t.palette.primary.main, 0.08),
              color: "primary.main",
              flexShrink: 0,
            }}
          >
            <FilterListIcon sx={{ fontSize: 20 }} />
          </Box>
          <Box>
            {title ? (
              <Typography variant="subtitle2" sx={{ fontWeight: 700, letterSpacing: "-0.01em" }}>
                {title}
              </Typography>
            ) : null}
            {subtitle ? (
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ mt: 0.25, display: "block", lineHeight: 1.45 }}
              >
                {subtitle}
              </Typography>
            ) : null}
          </Box>
        </Box>
      )}

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: {
            xs: "1fr",
            sm: "repeat(2, minmax(0, 1fr))",
            md: "repeat(3, minmax(0, 1fr))",
            lg: "repeat(4, minmax(0, 1fr))",
          },
          gap: 2,
          alignItems: "end",
        }}
      >
        {children}
      </Box>

      {footer ? (
        <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 1, mt: 2, flexWrap: "wrap" }}>
          {footer}
        </Box>
      ) : null}
      {!footer && onSearch && onClear ? (
        <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 1, mt: 2, flexWrap: "wrap" }}>
          <FilterCardFooter
            onSearch={onSearch}
            onClear={onClear}
            disabled={disabled}
            clearDisabled={clearDisabled}
            searchLabel={searchLabel}
            clearLabel={clearLabel}
          />
        </Box>
      ) : null}
    </Paper>
  );
}

export function FilterFieldItem({ children }: { children: React.ReactNode }) {
  return <Box sx={{ minWidth: 0 }}>{children}</Box>;
}

export function FilterTextInput(props: Omit<FormTextFieldProps, "fullWidth">) {
  return <FormTextField {...props} fullWidth />;
}

export function FilterSelectInput(props: Omit<FormSelectFieldProps, "fullWidth">) {
  return <FormSelectField {...props} fullWidth />;
}

export function FilterDateInput(props: Omit<FormTextFieldProps, "type" | "fullWidth">) {
  return <FormTextField {...props} type="date" fullWidth InputLabelProps={{ shrink: true }} />;
}

export function FilterCardFooter({
  onSearch,
  onClear,
  disabled,
  clearDisabled,
  searchLabel = "Search",
  clearLabel = "Clear",
}: {
  onSearch: () => void;
  onClear: () => void;
  disabled?: boolean;
  clearDisabled?: boolean;
  searchLabel?: string;
  clearLabel?: string;
}) {
  return (
    <>
      <Button
        variant="contained"
        onClick={onSearch}
        disabled={disabled}
        sx={{
          minWidth: 108,
          "&:hover": {
            boxShadow: (t) => `0 6px 18px ${alpha(t.palette.primary.main, 0.28)}`,
          },
        }}
      >
        {searchLabel}
      </Button>
      <Button variant="outlined" onClick={onClear} disabled={disabled || clearDisabled} sx={{ minWidth: 92 }}>
        {clearLabel}
      </Button>
    </>
  );
}

/** Backward-compatible alias used in existing modules. */
export const FilterActions = FilterCardFooter;
