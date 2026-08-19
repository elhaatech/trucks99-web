"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Slider from "@mui/material/Slider";
import TextField from "@mui/material/TextField";
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import CalculateOutlinedIcon from "@mui/icons-material/CalculateOutlined";
import { PRODUCT_THEME as T, INFO, SUCCESS } from "@/lib/theme";
import { EMPTY_EMI_RESULT, formatInr, type EmiCalculationResult } from "@/lib/emiUtils";
import { calculateEmiApi, getEmiDefaults } from "@/model/services/emi";

const MIN_RATE = 1;
const MAX_RATE = 24;
const MIN_DOWN_PCT = 0;
const MAX_DOWN_PCT = 90;

type EmiCalculatorProps = {
  defaultVehiclePrice?: number;
  /** @deprecated use variant */
  compact?: boolean;
  showChart?: boolean;
  /** default = card, modal = inside dialog, sidebar = narrow teaser */
  variant?: "default" | "modal" | "sidebar";
  onOpenFullCalculator?: () => void;
};

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

function parsePositiveNumber(raw: string): number {
  const cleaned = raw.replace(/[^\d.]/g, "");
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : 0;
}

function EmiDonutChart({
  principal,
  interest,
  size = 148,
}: {
  principal: number;
  interest: number;
  size?: number;
}) {
  const total = principal + interest;
  const principalPct = total > 0 ? (principal / total) * 100 : 100;
  const interestPct = Math.max(0, 100 - principalPct);
  const inner = Math.round(size * 0.56);

  return (
    <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 1.5 }}>
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
            bgcolor: "#fff",
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
          <Typography sx={{ fontSize: 12, fontWeight: 800, color: T.color.textPrimary, px: 1, textAlign: "center" }}>
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
            Interest {interestPct.toFixed(0)}%
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
        bgcolor: "rgba(255,255,255,0.85)",
        border: "1px solid rgba(37,99,235,0.1)",
      }}
    >
      <Typography sx={{ fontSize: 11, color: T.color.textMuted, mb: 0.25 }}>{label}</Typography>
      <Typography sx={{ fontWeight: 700, fontSize: 13, color: T.color.textPrimary, wordBreak: "break-word" }}>
        {value}
      </Typography>
    </Box>
  );
}

function FieldCard({ children }: { children: React.ReactNode }) {
  return (
    <Box
      sx={{
        p: 1.75,
        borderRadius: T.radius.md,
        bgcolor: "#f8fafc",
        border: `1px solid ${T.color.border}`,
      }}
    >
      {children}
    </Box>
  );
}

function useEmiApiCalculation(input: {
  vehiclePrice: number;
  downPayment: number;
  interestRate: number;
  tenureMonths: number;
  enabled?: boolean;
}) {
  const { vehiclePrice, downPayment, interestRate, tenureMonths, enabled = true } = input;
  const [result, setResult] = useState<EmiCalculationResult>(EMPTY_EMI_RESULT);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const reqId = useRef(0);

  useEffect(() => {
    if (!enabled) return;
    if (!Number.isFinite(vehiclePrice) || vehiclePrice < 0) return;
    if (!Number.isFinite(interestRate) || interestRate < MIN_RATE || interestRate > MAX_RATE) {
      setError(`Interest rate must be between ${MIN_RATE}% and ${MAX_RATE}%.`);
      return;
    }

    const controller = new AbortController();
    const currentReq = ++reqId.current;

    const timer = window.setTimeout(() => {
      setLoading(true);
      setError(null);

      void calculateEmiApi(
        {
          vehiclePrice,
          downPayment: clamp(downPayment, 0, vehiclePrice),
          interestRate: clamp(interestRate, MIN_RATE, MAX_RATE),
          tenureMonths,
        },
        controller.signal,
      )
        .then((data) => {
          if (currentReq !== reqId.current) return;
          setResult({
            monthlyEmi: data.monthlyEmi,
            totalPayable: data.totalPayable,
            totalInterest: data.totalInterest,
            principalAmount: data.principalAmount,
            loanAmount: data.loanAmount,
          });
        })
        .catch((err: unknown) => {
          if (controller.signal.aborted) return;
          if (err instanceof DOMException && err.name === "AbortError") return;
          if (err instanceof Error && err.name === "AbortError") return;
          if (currentReq !== reqId.current) return;
          setError(err instanceof Error ? err.message : "Failed to calculate EMI");
        })
        .finally(() => {
          if (!controller.signal.aborted && currentReq === reqId.current) {
            setLoading(false);
          }
        });
    }, 300);

    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [vehiclePrice, downPayment, interestRate, tenureMonths, enabled]);

  return { result, loading, error };
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

  const safeDefaultPrice = Math.max(0, Number(defaultVehiclePrice) || 0);
  const [ready, setReady] = useState(false);
  const [vehiclePrice, setVehiclePrice] = useState(safeDefaultPrice);
  const [downPaymentPct, setDownPaymentPct] = useState(20);
  const [interestRate, setInterestRate] = useState(10);
  const [tenureYears, setTenureYears] = useState(3);
  const [tenureOptionsYears, setTenureOptionsYears] = useState([1, 2, 3, 4, 5]);
  const tenureMonths = tenureYears * 12;

  const downPayment = Math.round(vehiclePrice * (downPaymentPct / 100));

  useEffect(() => {
    const controller = new AbortController();
    setReady(false);

    void getEmiDefaults(controller.signal)
      .then((defaults) => {
        if (controller.signal.aborted) return;
        const years = defaults.tenures
          .filter((m) => m % 12 === 0)
          .map((m) => m / 12)
          .sort((a, b) => a - b);
        if (years.length) setTenureOptionsYears(years);

        const rate = clamp(Number(defaults.defaultInterestRate) || 10, MIN_RATE, MAX_RATE);
        const downPct = clamp(Number(defaults.defaultDownPaymentPercent) || 20, MIN_DOWN_PCT, MAX_DOWN_PCT);
        const tenureYr = Math.round((Number(defaults.defaultTenureMonths) || 36) / 12);

        setInterestRate(rate);
        setDownPaymentPct(downPct);
        if (!years.length || years.includes(tenureYr)) setTenureYears(tenureYr || 3);
        setVehiclePrice(safeDefaultPrice);
        setReady(true);
      })
      .catch(() => {
        if (controller.signal.aborted) return;
        setVehiclePrice(safeDefaultPrice);
        setInterestRate(10);
        setDownPaymentPct(20);
        setTenureYears(3);
        setReady(true);
      });

    return () => controller.abort();
  }, [safeDefaultPrice]);

  const { result, loading, error } = useEmiApiCalculation({
    vehiclePrice,
    downPayment,
    interestRate,
    tenureMonths,
    enabled: ready && !isSidebar,
  });

  const priceInputValue = useMemo(() => (vehiclePrice ? String(vehiclePrice) : ""), [vehiclePrice]);

  if (isSidebar) {
    return (
      <EmiSummary
        vehiclePrice={safeDefaultPrice}
        onClick={onOpenFullCalculator}
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
            md: showChart ? "minmax(0, 1.05fr) minmax(0, 0.95fr)" : "1fr 1fr",
          },
          gap: { xs: 2.5, md: 3 },
        }}
      >
        <Box sx={{ display: "flex", flexDirection: "column", gap: 1.75 }}>
          <Typography sx={{ fontSize: 13, fontWeight: 700, color: T.color.textPrimary }}>
            Loan details
          </Typography>

          <TextField
            fullWidth
            size="small"
            label="Vehicle price (₹)"
            value={priceInputValue}
            onChange={(e) => setVehiclePrice(Math.max(0, Math.round(parsePositiveNumber(e.target.value))))}
            inputProps={{ inputMode: "numeric" }}
            helperText="Amount used for EMI estimate"
          />

          <FieldCard>
            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 0.5 }}>
              <Typography sx={{ fontSize: 13, fontWeight: 600, color: T.color.textSecondary }}>
                Down payment
              </Typography>
              <Typography sx={{ fontSize: 13, fontWeight: 700, color: INFO }}>
                {formatInr(downPayment)} ({downPaymentPct}%)
              </Typography>
            </Box>
            <Slider
              value={downPaymentPct}
              min={MIN_DOWN_PCT}
              max={MAX_DOWN_PCT}
              step={1}
              onChange={(_, v) => setDownPaymentPct(v as number)}
              sx={{ mt: 0.5, color: INFO }}
            />
          </FieldCard>

          <FieldCard>
            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 0.5 }}>
              <Typography sx={{ fontSize: 13, fontWeight: 600, color: T.color.textSecondary }}>
                Interest rate (p.a.)
              </Typography>
              <Typography sx={{ fontSize: 13, fontWeight: 700, color: INFO }}>
                {interestRate.toFixed(1)}%
              </Typography>
            </Box>
            <Slider
              value={interestRate}
              min={MIN_RATE}
              max={MAX_RATE}
              step={0.1}
              onChange={(_, v) => setInterestRate(Number((v as number).toFixed(1)))}
              sx={{ mt: 0.5, color: INFO }}
            />
            <Typography sx={{ fontSize: 11, color: T.color.textMuted }}>
              Allowed range {MIN_RATE}% – {MAX_RATE}%
            </Typography>
          </FieldCard>

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
              {tenureOptionsYears.map((y) => (
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
              position: "relative",
              minHeight: 210,
            }}
          >
            {loading || !ready ? (
              <Box sx={{ position: "absolute", top: 12, right: 12 }}>
                <CircularProgress size={16} />
              </Box>
            ) : null}

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
            <Typography sx={{ fontSize: { xs: 30, md: 36 }, fontWeight: 800, color: INFO, lineHeight: 1.05 }}>
              {!ready || loading ? "…" : formatInr(result.monthlyEmi)}
              <Typography component="span" sx={{ fontSize: 15, fontWeight: 600, color: T.color.textSecondary, ml: 0.5 }}>
                /mo
              </Typography>
            </Typography>

            {error ? (
              <Typography sx={{ mt: 1, fontSize: 12, color: "#dc2626" }}>{error}</Typography>
            ) : (
              <Typography sx={{ mt: 1, fontSize: 11, color: T.color.textMuted }}>
                Live estimate based on your loan details
              </Typography>
            )}

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
  loading = false,
}: {
  vehiclePrice: number;
  onClick?: () => void;
  monthlyEmi?: number;
  loading?: boolean;
}) {
  const [emi, setEmi] = useState(monthlyEmi ?? 0);
  const [interestRate, setInterestRate] = useState(10);
  const [downPct, setDownPct] = useState(20);
  const [tenureMonths, setTenureMonths] = useState(36);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (monthlyEmi != null) {
      setEmi(monthlyEmi);
      return;
    }

    const controller = new AbortController();
    setBusy(true);

    void (async () => {
      try {
        const defaults = await getEmiDefaults(controller.signal);
        const rate = clamp(defaults.defaultInterestRate, MIN_RATE, MAX_RATE);
        const pct = clamp(defaults.defaultDownPaymentPercent, MIN_DOWN_PCT, MAX_DOWN_PCT);
        setInterestRate(rate);
        setDownPct(pct);
        setTenureMonths(defaults.defaultTenureMonths);
        const downPayment = Math.round(vehiclePrice * (pct / 100));
        const data = await calculateEmiApi(
          {
            vehiclePrice,
            downPayment,
            interestRate: rate,
            tenureMonths: defaults.defaultTenureMonths,
          },
          controller.signal,
        );
        setEmi(data.monthlyEmi);
      } catch {
        if (!controller.signal.aborted) setEmi(0);
      } finally {
        if (!controller.signal.aborted) setBusy(false);
      }
    })();

    return () => controller.abort();
  }, [vehiclePrice, monthlyEmi]);

  const downPayment = Math.round(vehiclePrice * (downPct / 100));
  const showLoading = loading || busy;

  return (
    <Box
      sx={{
        p: 2,
        borderRadius: T.radius.md,
        bgcolor: T.color.surfaceMuted,
        border: `1px solid ${T.color.border}`,
      }}
    >
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
          <Typography sx={{ fontSize: 11, color: T.color.textMuted }}>
            @ {interestRate}% · {Math.round(tenureMonths / 12)} years
          </Typography>
        </Box>
      </Box>

      <Typography sx={{ fontWeight: 800, fontSize: 26, color: INFO, lineHeight: 1.1 }}>
        {showLoading ? "…" : formatInr(emi)}
        <Typography component="span" sx={{ fontSize: 14, fontWeight: 500, color: T.color.textSecondary }}>
          {" "}
          /month
        </Typography>
      </Typography>

      <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1, mt: 1.5 }}>
        <Box>
          <Typography sx={{ fontSize: 11, color: T.color.textMuted }}>Down payment</Typography>
          <Typography sx={{ fontSize: 13, fontWeight: 600 }}>{formatInr(downPayment)}</Typography>
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
    </Box>
  );
}
