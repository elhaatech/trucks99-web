"use client";

import Chip from "@mui/material/Chip";

type ChipColor =
  | "warning"
  | "default"
  | "success"
  | "error"
  | "info"
  | "primary"
  | "secondary";

const STATUS_CONFIG: Record<string, { label: string; color: ChipColor }> = {
  pending: { label: "Pending", color: "warning" },
  draft: { label: "Draft", color: "default" },
  active: { label: "Active", color: "success" },
  inactive: { label: "Inactive", color: "error" },
  rejected: { label: "Rejected", color: "error" },
  booking: { label: "Booked", color: "info" },
  purchased: { label: "Purchased", color: "primary" },
  sold: { label: "Sold", color: "secondary" },
};

export function ProductStatusChip({
  status,
  size = "small",
}: {
  status?: string;
  size?: "small" | "medium";
}) {
  const key = (status ?? "").toLowerCase().trim();
  const config = STATUS_CONFIG[key] ?? {
    label: status || "—",
    color: "default" as ChipColor,
  };

  return (
    <Chip
      label={config.label}
      color={config.color}
      size={size}
      variant="filled"
      sx={{
        fontSize: size === "small" ? 11 : 12,
        fontWeight: 700,
        height: size === "small" ? 24 : 28,
        borderRadius: "99px",
        letterSpacing: 0.2,
      }}
    />
  );
}
