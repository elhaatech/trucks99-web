"use client";

import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { EmiCalculator } from "@/app/common/components/buysell";
import { PRODUCT_THEME as T } from "@/lib/theme";

export default function UserEmiCalculatorPage() {
  return (
    <Box>
      <Typography sx={{ fontWeight: 800, fontSize: 24, mb: 0.5, color: T.color.textPrimary }}>
        EMI Calculator
      </Typography>
      <Typography sx={{ color: T.color.textSecondary, mb: 3 }}>
        Estimate monthly payments for your commercial vehicle purchase.
      </Typography>
      <EmiCalculator showChart />
    </Box>
  );
}
