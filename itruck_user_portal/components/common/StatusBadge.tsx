"use client";

import Chip from "@mui/material/Chip";

export type LoadStatusUi = "pending" | "assigned" | "accepted" | "rejected" | "delivered" | "cancelled" | "draft" | undefined;

export interface StatusBadgeProps {
  status: LoadStatusUi;
  /** When true, rejected status displays as "Cancelled" */
  cancelledLabelForRejected?: boolean;
}

const SX: Record<string, { bgcolor: string; color: string }> = {
  delivered: { bgcolor: "success.light", color: "success.dark" },
  accepted: { bgcolor: "info.light", color: "info.dark" },
  rejected: { bgcolor: "error.light", color: "error.dark" },
  cancelled: { bgcolor: "error.light", color: "error.dark" },
  assigned: { bgcolor: "warning.light", color: "warning.dark" },
  pending: { bgcolor: "grey.200", color: "text.secondary" },
  default: { bgcolor: "grey.200", color: "text.secondary" },
};

export function StatusBadge({ status, cancelledLabelForRejected = true }: StatusBadgeProps) {
  const key =
    status === "delivered" ||
    status === "accepted" ||
    status === "rejected" ||
    status === "cancelled" ||
    status === "assigned" ||
    status === "pending"
      ? status
      : "default";
  const label =
    status === "rejected" && cancelledLabelForRejected
      ? "Cancelled"
      : status === "cancelled"
        ? "Cancelled"
        : status || "—";
  const colors = SX[key] ?? SX.default;
  return <Chip size="small" label={label} sx={{ bgcolor: colors.bgcolor, color: colors.color }} />;
}
