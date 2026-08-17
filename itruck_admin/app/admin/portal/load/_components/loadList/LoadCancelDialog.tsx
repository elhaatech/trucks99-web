"use client";

import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { ConfirmDialog, FormField } from "@/components/common";

export interface LoadCancelDialogProps {
  open: boolean;
  onClose: () => void;
  reason: string;
  onReasonChange: (val: string) => void;
  onSubmit: () => Promise<void>;
}

export function LoadCancelDialog({
  open,
  onClose,
  reason,
  onReasonChange,
  onSubmit,
}: LoadCancelDialogProps) {
  const trimmed = reason.trim();
  const hasError = open && trimmed.length === 0;

  const handleConfirm = async () => {
    if (!trimmed) return;
    await onSubmit();
  };

  return (
    <ConfirmDialog
      open={open}
      onClose={onClose}
      onConfirm={handleConfirm}
      title="Cancel Load"
      confirmLabel="Cancel Load"
      confirmColor="error"
      pendingLabel="Saving…"
      description={
        <Typography variant="body2">
          Please enter a reason for cancelling this load.
        </Typography>
      }
    >
      <FormField label="Reason for cancel" required>
        <TextField
          value={reason}
          onChange={(e) => onReasonChange(e.target.value)}
          fullWidth
          multiline
          rows={3}
          required
          size="small"
          name="cancelReason"
          error={hasError}
          helperText={
            hasError
              ? "Reason is required."
              : "Provide a short, clear reason for audit history."
          }
          placeholder="e.g. Customer requested cancellation due to route change"
          inputProps={{ "aria-label": "Reason for cancel" }}
        />
      </FormField>
    </ConfirmDialog>
  );
}
