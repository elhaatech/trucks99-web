"use client";

import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { AppCard } from "@/components/ui";

export function PanelCard({
  title,
  action,
  children,
}: {
  title?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <AppCard hover={false} padding={3} sx={{ height: "100%" }}>
      {(title || action) && (
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2.5, gap: 2, flexWrap: "wrap" }}>
          {title ? (
            <Typography variant="h6" fontWeight={700} letterSpacing="-0.01em">
              {title}
            </Typography>
          ) : null}
          {action}
        </Box>
      )}
      {children}
    </AppCard>
  );
}

export function ToggleGroup({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <Box sx={{ display: "flex", gap: 0.5, bgcolor: "action.hover", p: 0.5, borderRadius: "10px", flexWrap: "wrap" }}>
      {options.map((o) => (
        <Box
          key={o.value}
          onClick={() => onChange(o.value)}
          sx={{
            fontSize: 12,
            px: 1.5,
            py: 0.6,
            borderRadius: "8px",
            cursor: "pointer",
            fontWeight: 600,
            bgcolor: value === o.value ? "background.paper" : "transparent",
            color: value === o.value ? "primary.main" : "text.secondary",
            boxShadow: value === o.value ? "0 2px 8px rgba(0,0,0,0.06)" : "none",
            transition: "all 0.2s ease",
            "&:hover": { color: "primary.main" },
          }}
        >
          {o.label}
        </Box>
      ))}
    </Box>
  );
}

export function SectionError({ message }: { message?: string | null }) {
  if (!message) return null;
  return (
    <Typography color="error" sx={{ fontSize: 13, py: 2, textAlign: "center" }}>
      {message}
    </Typography>
  );
}

export function formatShortDate(value?: string | null): string {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

export function formatDateTime(value?: string | null): string {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}
