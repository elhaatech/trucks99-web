"use client";

import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <Box
      sx={{
        minHeight: "60vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 2,
        px: 3,
        textAlign: "center",
      }}
    >
      <Typography variant="h5" fontWeight={700}>
        Something went wrong
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 560 }}>
        {error?.message || "A client-side exception occurred. Try again."}
      </Typography>
      <Button variant="contained" onClick={reset} sx={{ textTransform: "none" }}>
        Try again
      </Button>
    </Box>
  );
}
