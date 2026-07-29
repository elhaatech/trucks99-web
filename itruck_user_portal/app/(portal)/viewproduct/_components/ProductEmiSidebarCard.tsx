"use client";

import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import CalculateOutlinedIcon from "@mui/icons-material/CalculateOutlined";
import { PRODUCT_THEME as T, INFO } from "@/lib/theme";
import { formatInr } from "@/lib/emiUtils";

type ProductEmiSidebarCardProps = {
  vehiclePrice: number;
  onOpenCalculator: () => void;
};

export function ProductEmiSidebarCard({ vehiclePrice, onOpenCalculator }: ProductEmiSidebarCardProps) {
  const downPayment = Math.round(vehiclePrice * 0.1);
  const interestRate = 8.4;

  return (
    <Box
      sx={{
        p: 2,
        borderRadius: T.radius.lg,
        border: `1px solid ${T.color.border}`,
        bgcolor: T.color.surfaceMuted,
      }}
    >
      <Typography sx={{ fontSize: 13, fontWeight: 700, color: T.color.textPrimary, mb: 1.5 }}>
        EMI Calculator (Improved)
      </Typography>

      <Box sx={{ display: "flex", flexDirection: "column", gap: 1.25, mb: 2 }}>
        <Box sx={{ display: "flex", justifyContent: "space-between", gap: 1 }}>
          <Typography sx={{ fontSize: 13, color: T.color.textSecondary }}>Vehicle Price</Typography>
          <Typography sx={{ fontSize: 13, fontWeight: 700 }}>{formatInr(vehiclePrice)}</Typography>
        </Box>
        <Box sx={{ display: "flex", justifyContent: "space-between", gap: 1 }}>
          <Typography sx={{ fontSize: 13, color: T.color.textSecondary }}>Down Payment</Typography>
          <Typography sx={{ fontSize: 13, fontWeight: 700 }}>{formatInr(downPayment)}</Typography>
        </Box>
        <Box sx={{ display: "flex", justifyContent: "space-between", gap: 1 }}>
          <Typography sx={{ fontSize: 13, color: T.color.textSecondary }}>Interest Rate (p.a. %)</Typography>
          <Typography sx={{ fontSize: 13, fontWeight: 700 }}>{interestRate.toFixed(2)}</Typography>
        </Box>
      </Box>

      <Button
        fullWidth
        variant="outlined"
        startIcon={<CalculateOutlinedIcon />}
        onClick={onOpenCalculator}
        sx={{ textTransform: "none", fontWeight: 600, borderColor: "rgba(37,99,235,0.35)" }}
      >
        EMI Calculator
      </Button>
    </Box>
  );
}
