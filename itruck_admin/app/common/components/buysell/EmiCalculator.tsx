"use client";

import { useEffect, useMemo, useState } from "react";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Slider from "@mui/material/Slider";
import TextField from "@mui/material/TextField";
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import Button from "@mui/material/Button";
import CalculateOutlinedIcon from "@mui/icons-material/CalculateOutlined";
import { PRODUCT_THEME as T, INFO, SUCCESS } from "@/lib/theme";
import { calculateEmi, formatInr } from "@/lib/emiUtils";

type EmiCalculatorProps = {
  defaultVehiclePrice?: number;
  /** @deprecated use variant */
  compact?: boolean;
  showChart?: boolean;
  /** default = card, modal = inside dialog, sidebar = narrow teaser */
  variant?: "default" | "modal" | "sidebar";
  onOpenFullCalculator?: () => void;
};

function EmiDonutChart({
  principal,
  interest,
  size = 156,
}: {
  principal: number;
  interest: number;
  size?: number;
}) {
  const total = principal + interest;
  const principalPct = total > 0 ? (principal / total) * 100 : 50;
  const inner = Math.round(size * 0.56);

  return (
    <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
      <Box
        sx={{
          width: size,
          height: size,
          borderRadius: "50%",
          background: `conic-gradient(${INFO} 0 ${principalPct}%, ${SUCCESS} ${principalPct}% 100%)`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Box
          sx={{
            width: inner,
            height: inner,
            borderRadius: "50%",
            bgcolor: T.color.surface,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexDirection: "column",
            boxShadow: "inset 0 0 0 1px rgba(15,23,42,0.06)",
          }}
        >
          <Typography sx={{ fontSize: 10, color: T.color.textMuted, fontWeight: 700, letterSpacing: 0.4 }}>
            LOAN COST
          </Typography>
          <Typography sx={{ fontSize: 13, fontWeight: 800, color: T.color.textPrimary }}>
            {formatInr(total)}
          </Typography>
        </Box>
      </Box>
      <Box sx={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 2 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
          <Box sx={{ width: 10, height: 10, borderRadius: "50%", bgcolor: INFO }} />
          <Typography sx={{ fontSize: 12, color: T.color.textSecondary, fontWeight: 500 }}>
            Principal {principalPct.toFixed(0)}%
          </Typography>
        </Box>
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
          <Box sx={{ width: 10, height: 10, borderRadius: "50%", bgcolor: SUCCESS }} />
          <Typography sx={{ fontSize: 12, color: T.color.textSecondary, fontWeight: 500 }}>
            Interest {(100 - principalPct).toFixed(0)}%
          </Typography>
        </Box>
      </Box>
    </Box>
  );
}

function SummaryStat({ label, value }: { label: string; value: string }) {
  return (
    <Box
      sx={{
        p: 1.25,
        borderRadius: T.radius.sm,
        bgcolor: "rgba(255,255,255,0.7)",
        border: "1px solid rgba(37,99,235,0.1)",
      }}
    >
      <Typography sx={{ fontSize: 11, color: T.color.textMuted, mb: 0.25 }}>{label}</Typography>
      <Typography sx={{ fontWeight: 700, fontSize: 14, color: T.color.textPrimary }}>{value}</Typography>
    </Box>
  );
}

export function EmiCalculator({
  defaultVehiclePrice = 500000,
  compact = false,
  showChart = true,
  variant,
  onOpenFullCalculator,
}: EmiCalculatorProps) {
  const resolvedVariant = variant ?? (compact ? "sidebar" : "default");
  const isModal = resolvedVariant === "modal";
  const isSidebar = resolvedVariant === "sidebar";

  const [vehiclePrice, setVehiclePrice] = useState(defaultVehiclePrice);
  const [downPayment, setDownPayment] = useState(Math.round(defaultVehiclePrice * 0.2));
  const [interestRate, setInterestRate] = useState(10);
  const [tenureYears, setTenureYears] = useState(3);
  const tenureMonths = tenureYears * 12;

  useEffect(() => {
    setVehiclePrice(defaultVehiclePrice);
    setDownPayment(Math.round(defaultVehiclePrice * 0.2));
  }, [defaultVehiclePrice]);

  useEffect(() => {
    setDownPayment((prev) => Math.min(prev, vehiclePrice));
  }, [vehiclePrice]);

  const sliderStep = useMemo(
    () => Math.max(1, Math.round(Math.max(vehiclePrice, 1) / 40)),
    [vehiclePrice],
  );

  const result = useMemo(
    () =>
      calculateEmi({
        vehiclePrice,
        downPayment,
        annualInterestRate: interestRate,
        tenureMonths,
      }),
    [vehiclePrice, downPayment, interestRate, tenureMonths],
  );

  if (isSidebar) {
    return (
      <EmiSummary
        vehiclePrice={vehiclePrice}
        onClick={onOpenFullCalculator}
        monthlyEmi={result.monthlyEmi}
      />
    );
  }

  return (
    <Box
      sx={{
        p: isModal ? 0 : 3,
        borderRadius: isModal ? 0 : T.radius.lg,
        border: isModal ? "none" : `1px solid ${T.color.border}`,
        bgcolor: isModal ? "transparent" : T.color.surface,
        boxShadow: isModal ? "none" : T.shadow.card,
      }}
    >
      {!isModal ? (
        <Typography sx={{ fontWeight: 700, fontSize: 18, mb: 2, color: T.color.textPrimary }}>
          EMI Calculator
        </Typography>
      ) : null}

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: {
            xs: "1fr",
            md: showChart ? "minmax(0, 1.1fr) minmax(0, 0.9fr)" : "1fr 1fr",
          },
          gap: { xs: 2.5, md: 3 },
        }}
      >
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            gap: 2,
            p: isModal ? { xs: 0, md: 0.5 } : 0,
          }}
        >
          <Typography sx={{ fontSize: 13, fontWeight: 700, color: T.color.textPrimary, mb: -0.5 }}>
            Loan details
          </Typography>

          <TextField
            fullWidth
            size="small"
            label="Vehicle price (₹)"
            type="number"
            value={vehiclePrice}
            onChange={(e) => setVehiclePrice(Math.max(0, Number(e.target.value) || 0))}
            inputProps={{ min: 0 }}
          />

          <Box
            sx={{
              p: 1.75,
              borderRadius: T.radius.md,
              bgcolor: "#f8fafc",
              border: `1px solid ${T.color.border}`,
            }}
          >
            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 0.5 }}>
              <Typography sx={{ fontSize: 13, fontWeight: 600, color: T.color.textSecondary }}>
                Down payment
              </Typography>
              <Typography sx={{ fontSize: 13, fontWeight: 700, color: INFO }}>
                {formatInr(downPayment)}
              </Typography>
            </Box>
            <Slider
              value={Math.min(downPayment, vehiclePrice)}
              min={0}
              max={Math.max(vehiclePrice, 1)}
              step={sliderStep}
              onChange={(_, v) => setDownPayment(v as number)}
              sx={{ mt: 0.5, color: INFO }}
            />
            <Typography sx={{ fontSize: 11, color: T.color.textMuted }}>
              {vehiclePrice > 0
                ? `${Math.round((downPayment / vehiclePrice) * 100)}% of vehicle price`
                : "—"}
            </Typography>
          </Box>

          <TextField
            fullWidth
            size="small"
            label="Interest rate (% p.a.)"
            type="number"
            value={interestRate}
            onChange={(e) => setInterestRate(Math.max(0, Number(e.target.value) || 0))}
            inputProps={{ min: 0, step: 0.1 }}
          />

          <Box>
            <Typography sx={{ fontSize: 13, fontWeight: 600, color: T.color.textSecondary, mb: 1 }}>
              Loan tenure
            </Typography>
            <ToggleButtonGroup
              exclusive
              size="small"
              value={tenureYears}
              onChange={(_, v) => v && setTenureYears(v)}
              sx={{
                display: "flex",
                flexWrap: "wrap",
                gap: 0.75,
                "& .MuiToggleButtonGroup-grouped": {
                  border: `1px solid ${T.color.border} !important`,
                  borderRadius: `${T.radius.sm} !important`,
                  mx: 0,
                  px: 2,
                  py: 0.65,
                  textTransform: "none",
                  fontWeight: 600,
                  fontSize: 13,
                  "&.Mui-selected": {
                    bgcolor: INFO,
                    color: "#fff",
                    borderColor: `${INFO} !important`,
                    "&:hover": { bgcolor: "#1d4ed8" },
                  },
                },
              }}
            >
              {[1, 2, 3, 4, 5].map((y) => (
                <ToggleButton key={y} value={y}>
                  {y} yr
                </ToggleButton>
              ))}
            </ToggleButtonGroup>
          </Box>
        </Box>

        <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <Box
            sx={{
              p: 2.5,
              borderRadius: T.radius.lg,
              background: "linear-gradient(135deg, rgba(37,99,235,0.08) 0%, rgba(37,99,235,0.03) 100%)",
              border: "1px solid rgba(37,99,235,0.18)",
            }}
          >
            <Typography
              sx={{
                fontSize: 11,
                color: INFO,
                textTransform: "uppercase",
                fontWeight: 700,
                letterSpacing: 0.6,
                mb: 1,
              }}
            >
              EMI Summary
            </Typography>
            <Typography sx={{ fontSize: 13, color: T.color.textSecondary, mb: 0.5 }}>
              Estimated monthly EMI
            </Typography>
            <Typography sx={{ fontSize: { xs: 34, md: 38 }, fontWeight: 800, color: INFO, lineHeight: 1.05 }}>
              {formatInr(result.monthlyEmi)}
              <Typography component="span" sx={{ fontSize: 16, fontWeight: 600, color: T.color.textSecondary, ml: 0.5 }}>
                /mo
              </Typography>
            </Typography>

            <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1.25, mt: 2.5 }}>
              <SummaryStat label="Total payable" value={formatInr(result.totalPayable)} />
              <SummaryStat label="Total interest" value={formatInr(result.totalInterest)} />
              <SummaryStat label="Principal" value={formatInr(result.principalAmount)} />
              <SummaryStat label="Loan amount" value={formatInr(result.loanAmount)} />
            </Box>
          </Box>

          {showChart ? (
            <Box
              sx={{
                p: 2,
                borderRadius: T.radius.lg,
                border: `1px solid ${T.color.border}`,
                bgcolor: "#fafbfc",
                display: "flex",
                justifyContent: "center",
              }}
            >
              <EmiDonutChart principal={result.loanAmount} interest={result.totalInterest} />
            </Box>
          ) : null}
        </Box>
      </Box>
    </Box>
  );
}

export function EmiSummary({
  vehiclePrice,
  onClick,
  monthlyEmi,
}: {
  vehiclePrice: number;
  onClick?: () => void;
  monthlyEmi?: number;
}) {
  const result = calculateEmi({
    vehiclePrice,
    downPayment: Math.round(vehiclePrice * 0.2),
    annualInterestRate: 10,
    tenureMonths: 36,
  });
  const emi = monthlyEmi ?? result.monthlyEmi;

  const content = (
    <>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
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
        <Box>
          <Typography sx={{ fontSize: 13, fontWeight: 700, color: T.color.textPrimary }}>
            EMI Calculator
          </Typography>
          <Typography sx={{ fontSize: 11, color: T.color.textMuted }}>@ 10% · 3 years</Typography>
        </Box>
      </Box>

      <Typography sx={{ fontWeight: 800, fontSize: 26, color: INFO, lineHeight: 1.1 }}>
        {formatInr(emi)}
        <Typography component="span" sx={{ fontSize: 14, fontWeight: 500, color: T.color.textSecondary }}>
          {" "}
          /month
        </Typography>
      </Typography>

      <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1, mt: 1.5 }}>
        <Box>
          <Typography sx={{ fontSize: 11, color: T.color.textMuted }}>Down payment</Typography>
          <Typography sx={{ fontSize: 13, fontWeight: 600 }}>
            {formatInr(Math.round(vehiclePrice * 0.2))}
          </Typography>
        </Box>
        <Box>
          <Typography sx={{ fontSize: 11, color: T.color.textMuted }}>Vehicle price</Typography>
          <Typography sx={{ fontSize: 13, fontWeight: 600 }}>{formatInr(vehiclePrice)}</Typography>
        </Box>
      </Box>

      {onClick ? (
        <Button
          fullWidth
          size="small"
          variant="outlined"
          onClick={onClick}
          sx={{ mt: 1.75, textTransform: "none", fontWeight: 600, borderColor: "rgba(37,99,235,0.35)" }}
        >
          Open full calculator
        </Button>
      ) : null}
    </>
  );

  return (
    <Box
      sx={{
        p: 2,
        borderRadius: T.radius.md,
        bgcolor: T.color.surfaceMuted,
        border: `1px solid ${T.color.border}`,
      }}
    >
      {content}
    </Box>
  );
}
