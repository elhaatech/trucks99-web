"use client";

import Chip from "@mui/material/Chip";

export interface AdvertisementStatusChipProps {
  status: unknown;
  size?: "small" | "medium";
}

function normalizeStatus(status: unknown): string {
  return String(status ?? "").trim().toLowerCase();
}

export function AdvertisementStatusChip({
  status,
  size = "small",
}: AdvertisementStatusChipProps) {
  const disabled = normalizeStatus(status) === "disabled";
  const label = disabled ? "Disabled" : "Enabled";

  return (
    <Chip
      size={size}
      label={label}
      variant="outlined"
      sx={
        disabled
          ? { borderColor: "error.main", color: "error.dark" }
          : { borderColor: "success.main", color: "success.dark" }
      }
    />
  );
}

export function getAdvertisementStatusAction(status: unknown): {
  action: "enable" | "disable";
  label: string;
} {
  const disabled = normalizeStatus(status) === "disabled";
  return disabled
    ? { action: "enable", label: "Enable" }
    : { action: "disable", label: "Disable" };
}
