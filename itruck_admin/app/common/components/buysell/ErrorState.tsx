"use client";

import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import Alert from "@mui/material/Alert";
import { PRODUCT_THEME as T } from "@/lib/theme";

type ErrorStateProps = {
  title?: string;
  message: string;
  onRetry?: () => void;
};

export function BuySellErrorState({
  title = "Something went wrong",
  message,
  onRetry,
}: ErrorStateProps) {
  return (
    <Box
      sx={{
        p: 4,
        borderRadius: T.radius.lg,
        border: `1px solid ${T.color.border}`,
        bgcolor: T.color.surface,
        textAlign: "center",
      }}
    >
      <Alert severity="error" sx={{ mb: 2, textAlign: "left" }}>
        <Typography fontWeight={700}>{title}</Typography>
        {message}
      </Alert>
      {onRetry ? (
        <Button variant="contained" onClick={onRetry}>
          Try again
        </Button>
      ) : null}
    </Box>
  );
}
