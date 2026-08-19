"use client";

import { useEffect, useState } from "react";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import CalculateOutlinedIcon from "@mui/icons-material/CalculateOutlined";
import { PRODUCT_THEME as T, INFO } from "@/lib/theme";
import { formatInr } from "@/lib/emiUtils";
import { calculateEmiApi, getEmiDefaults } from "@/model/services/emi";

type ProductEmiSidebarCardProps = {
  vehiclePrice: number;
  onOpenCalculator: () => void;
};

export function ProductEmiSidebarCard({ vehiclePrice, onOpenCalculator }: ProductEmiSidebarCardProps) {
  const [monthlyEmi, setMonthlyEmi] = useState(0);
  const [downPayment, setDownPayment] = useState(Math.round(vehiclePrice * 0.2));
  const [interestRate, setInterestRate] = useState(10);
  const [tenureMonths, setTenureMonths] = useState(36);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);

    void (async () => {
      try {
        const defaults = await getEmiDefaults(controller.signal);
        const down = Math.round(vehiclePrice * (defaults.defaultDownPaymentPercent / 100));
        setDownPayment(down);
        setInterestRate(defaults.defaultInterestRate);
        setTenureMonths(defaults.defaultTenureMonths);

        const data = await calculateEmiApi(
          {
            vehiclePrice,
            downPayment: down,
            interestRate: defaults.defaultInterestRate,
            tenureMonths: defaults.defaultTenureMonths,
          },
          controller.signal,
        );
        setMonthlyEmi(data.monthlyEmi);
      } catch (err: unknown) {
        if (controller.signal.aborted) return;
        setError(err instanceof Error ? err.message : "Unable to load EMI");
        setMonthlyEmi(0);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    })();

    return () => controller.abort();
  }, [vehiclePrice]);

  return (
    <Box
      sx={{
        p: 2,
        borderRadius: T.radius.lg,
        border: `1px solid ${T.color.border}`,
        bgcolor: T.color.surfaceMuted,
      }}
    >
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1.5 }}>
        <Box
          sx={{
            width: 32,
            height: 32,
            borderRadius: 1,
            bgcolor: "rgba(37,99,235,0.1)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <CalculateOutlinedIcon sx={{ fontSize: 18, color: INFO }} />
        </Box>
        <Typography sx={{ fontSize: 13, fontWeight: 700, color: T.color.textPrimary }}>
          EMI Calculator
        </Typography>
      </Box>

      <Typography sx={{ fontSize: 12, color: T.color.textMuted, mb: 0.5 }}>
        Estimated monthly EMI
      </Typography>
      <Typography sx={{ fontWeight: 800, fontSize: 26, color: INFO, lineHeight: 1.1, mb: 1.5 }}>
        {loading ? (
          <CircularProgress size={22} sx={{ color: INFO }} />
        ) : (
          <>
            {formatInr(monthlyEmi)}
            <Typography component="span" sx={{ fontSize: 14, fontWeight: 500, color: T.color.textSecondary }}>
              {" "}
              /month
            </Typography>
          </>
        )}
      </Typography>

      <Box sx={{ display: "flex", flexDirection: "column", gap: 1.25, mb: 2 }}>
        <Box sx={{ display: "flex", justifyContent: "space-between", gap: 1 }}>
          <Typography sx={{ fontSize: 13, color: T.color.textSecondary }}>Vehicle price</Typography>
          <Typography sx={{ fontSize: 13, fontWeight: 700 }}>{formatInr(vehiclePrice)}</Typography>
        </Box>
        <Box sx={{ display: "flex", justifyContent: "space-between", gap: 1 }}>
          <Typography sx={{ fontSize: 13, color: T.color.textSecondary }}>Down payment</Typography>
          <Typography sx={{ fontSize: 13, fontWeight: 700 }}>{formatInr(downPayment)}</Typography>
        </Box>
        <Box sx={{ display: "flex", justifyContent: "space-between", gap: 1 }}>
          <Typography sx={{ fontSize: 13, color: T.color.textSecondary }}>Interest rate</Typography>
          <Typography sx={{ fontSize: 13, fontWeight: 700 }}>{interestRate.toFixed(1)}% p.a.</Typography>
        </Box>
        <Box sx={{ display: "flex", justifyContent: "space-between", gap: 1 }}>
          <Typography sx={{ fontSize: 13, color: T.color.textSecondary }}>Tenure</Typography>
          <Typography sx={{ fontSize: 13, fontWeight: 700 }}>
            {Math.round(tenureMonths / 12)} years
          </Typography>
        </Box>
      </Box>

      {error ? (
        <Typography sx={{ fontSize: 12, color: "#dc2626", mb: 1.5 }}>{error}</Typography>
      ) : null}

      <Button
        fullWidth
        variant="outlined"
        startIcon={<CalculateOutlinedIcon />}
        onClick={onOpenCalculator}
        sx={{ textTransform: "none", fontWeight: 600, borderColor: "rgba(37,99,235,0.35)" }}
      >
        Open EMI calculator
      </Button>
    </Box>
  );
}
