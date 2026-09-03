"use client";

import * as React from "react";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import Button from "@mui/material/Button";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import IconButton from "@mui/material/IconButton";
import Divider from "@mui/material/Divider";
import CircularProgress from "@mui/material/CircularProgress";
import { alpha } from "@mui/material/styles";
import { CloseRounded as CloseRoundedIcon } from "@mui/icons-material";

export interface FormDialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: React.ReactNode;
  submitLabel?: string;
  cancelLabel?: string;
  onSubmit?: () => void | Promise<void>;
  hideSubmit?: boolean;
  loading?: boolean;
  children: React.ReactNode;
  maxWidth?: "xs" | "sm" | "md" | "lg" | "xl";
}

export function FormDialog({
  open,
  onClose,
  title,
  description,
  submitLabel = "Save",
  cancelLabel = "Cancel",
  onSubmit,
  hideSubmit = false,
  loading = false,
  children,
  maxWidth = "sm",
}: FormDialogProps) {
  const [submitting, setSubmitting] = React.useState(false);
  const handleSubmit = async () => {
    if (!onSubmit) return;
    setSubmitting(true);
    try {
      await onSubmit();
      onClose();
    } catch {
      // Caller may show error
    } finally {
      setSubmitting(false);
    }
  };

  const busy = loading || submitting;

  return (
    <Dialog
      open={open}
      onClose={busy ? undefined : onClose}
      maxWidth={maxWidth}
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
          overflow: "hidden",
          m: { xs: 1.5, sm: 3 },
          maxHeight: "calc(100dvh - 24px)",
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
            bgcolor: (t) => alpha(t.palette.primary.main, 0.08),
            backgroundImage: (t) =>
              `linear-gradient(135deg, ${alpha(t.palette.primary.main, 0.1)} 0%, ${alpha(t.palette.secondary.main, 0.06)} 100%)`,
          }}
        >
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="h6" sx={{ fontWeight: 700, letterSpacing: "-0.01em", lineHeight: 1.2 }}>
              {title}
            </Typography>
            {description ? (
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.75, lineHeight: 1.5 }}>
                {description}
              </Typography>
            ) : null}
          </Box>
          <IconButton
            size="small"
            onClick={onClose}
            disabled={busy}
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
      <DialogContent sx={{ px: { xs: 2, sm: 3 }, py: 2.5, bgcolor: "background.paper" }}>{children}</DialogContent>
      <Divider />
      <DialogActions
        sx={{
          px: { xs: 2, sm: 3 },
          py: 2,
          gap: 1,
          justifyContent: "flex-end",
          flexWrap: "wrap",
          bgcolor: (t) => alpha(t.palette.background.default, 0.5),
        }}
      >
        <Button onClick={onClose} disabled={busy} variant="outlined">
          {cancelLabel}
        </Button>
        {!hideSubmit ? (
          <Button variant="contained" onClick={handleSubmit} disabled={busy}>
            {submitting ? (
              <Box sx={{ display: "inline-flex", alignItems: "center", gap: 1 }}>
                <CircularProgress size={16} color="inherit" />
                <span>Saving…</span>
              </Box>
            ) : (
              submitLabel
            )}
          </Button>
        ) : null}
      </DialogActions>
    </Dialog>
  );
}
