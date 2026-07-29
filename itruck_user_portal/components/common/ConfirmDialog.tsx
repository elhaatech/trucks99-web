"use client";

import * as React from "react";
import Box from "@mui/material/Box";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import IconButton from "@mui/material/IconButton";
import Divider from "@mui/material/Divider";
import CircularProgress from "@mui/material/CircularProgress";
import { alpha } from "@mui/material/styles";
import { CloseRounded as CloseRoundedIcon } from "@mui/icons-material";
import { WarningTriangleIcon } from "@/components/ui/Icons";

export interface ConfirmDialogProps {
  open: boolean;
  title?: string;
  description?: React.ReactNode;
  /** Extra body content (e.g. form fields) below description */
  children?: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  confirmColor?: "primary" | "error";
  pendingLabel?: string;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
}

export function ConfirmDialog({
  open,
  title = "Are you sure?",
  description,
  children,
  confirmLabel = "Delete",
  cancelLabel = "Cancel",
  confirmColor = "error",
  pendingLabel = "Please wait…",
  onClose,
  onConfirm,
}: ConfirmDialogProps) {
  const [submitting, setSubmitting] = React.useState(false);

  const handleConfirm = async () => {
    setSubmitting(true);
    try {
      await onConfirm();
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={submitting ? undefined : onClose}
      maxWidth="xs"
      fullWidth
      keepMounted
      transitionDuration={{ enter: 220, exit: 160 }}
      slotProps={{
        backdrop: {
          sx: {
            bgcolor: "rgba(2, 6, 23, 0.45)",
            backdropFilter: "blur(5px)",
          },
        },
      }}
      PaperProps={{
        sx: {
          borderRadius: "14px",
          boxShadow: "0 24px 64px rgba(2, 6, 23, 0.24)",
          border: "1px solid",
          borderColor: "divider",
          m: { xs: 1.5, sm: 3 },
          overflow: "hidden",
        },
      }}
    >
      <DialogTitle sx={{ p: 0 }}>
        <Box
          sx={{
            px: { xs: 2, sm: 3 },
            py: 2.25,
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: 2,
            bgcolor: (t) => alpha(t.palette.error.main, 0.08),
            backgroundImage: (t) =>
              `linear-gradient(135deg, ${alpha(t.palette.error.main, 0.12)} 0%, ${alpha(t.palette.warning.main, 0.06)} 100%)`,
          }}
        >
          <Box sx={{ display: "flex", alignItems: "flex-start", gap: 1.25 }}>
            <Box component="span" sx={{ color: "error.main", display: "inline-flex", alignItems: "center", mt: 0.2 }}>
              <WarningTriangleIcon />
            </Box>
            <Typography variant="h6" sx={{ fontWeight: 700, letterSpacing: "-0.01em", lineHeight: 1.2 }}>
              {title}
            </Typography>
          </Box>
          <IconButton
            size="small"
            onClick={onClose}
            disabled={submitting}
            aria-label="Close dialog"
            sx={{
              mt: -0.25,
              color: "text.secondary",
              bgcolor: (t) => alpha(t.palette.text.primary, 0.04),
              "&:hover": { bgcolor: (t) => alpha(t.palette.text.primary, 0.08) },
            }}
          >
            <CloseRoundedIcon fontSize="small" />
          </IconButton>
        </Box>
      </DialogTitle>
      <Divider />
      <DialogContent sx={{ px: { xs: 2, sm: 3 }, pt: description || children ? 2 : 0, pb: 0, bgcolor: "background.paper" }}>
        {description && (
          <Typography variant="body2" color="text.secondary" sx={{ mb: children ? 2 : 0 }}>
            {description}
          </Typography>
        )}
        {children}
      </DialogContent>
      <DialogActions
        sx={{
          px: { xs: 2, sm: 3 },
          pb: 2,
          pt: 2,
          justifyContent: "flex-end",
          gap: 1,
          bgcolor: (t) => alpha(t.palette.background.default, 0.5),
        }}
      >
        <Button onClick={onClose} disabled={submitting} variant="outlined">
          {cancelLabel}
        </Button>
        <Button variant="contained" color={confirmColor} onClick={handleConfirm} disabled={submitting}>
          {submitting ? (
            <Box sx={{ display: "inline-flex", alignItems: "center", gap: 1 }}>
              <CircularProgress size={16} color="inherit" />
              <span>{pendingLabel}</span>
            </Box>
          ) : (
            confirmLabel
          )}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
