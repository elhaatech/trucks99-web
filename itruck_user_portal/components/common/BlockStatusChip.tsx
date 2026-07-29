"use client";

import Chip from "@mui/material/Chip";
import { getStatusText, isBlockedStatus } from "@/lib/blockUnblockUtils";

export interface BlockStatusChipProps {
  status: unknown;
  size?: "small" | "medium";
}

/**
 * Common Active/Blocked UI:
 * - Active  => green
 * - Blocked => red
 */
export function BlockStatusChip({ status, size = "small" }: BlockStatusChipProps) {
  const label = getStatusText(status);
  const blocked = isBlockedStatus(status);

  return (
    <Chip
      size={size}
      label={label}
      variant="outlined"
      sx={blocked ? { borderColor: "error.main", color: "error.dark" } : { borderColor: "success.main", color: "success.dark" }}
    />
  );
}

