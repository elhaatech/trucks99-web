import { publicApi } from "@/model/services/common_fixed";

export type EmiDefaults = {
  tenures: number[];
  defaultInterestRate: number;
  defaultDownPaymentPercent: number;
  defaultTenureMonths: number;
};

export type EmiCalculateInput = {
  vehiclePrice: number;
  downPayment: number;
  interestRate: number;
  tenureMonths: number;
};

export type EmiCalculateResult = {
  vehiclePrice: number;
  productPrice: number;
  downPayment: number;
  loanAmount: number;
  principalAmount: number;
  interestRate: number;
  annualInterestRate: number;
  tenure: number;
  tenureMonths: number;
  monthlyEmi: number;
  monthlyEMI: number;
  totalInterest: number;
  totalPayable: number;
};

type EmiDefaultsResponse = {
  message: string;
  data: EmiDefaults;
};

type EmiCalculateResponse = {
  message: string;
  data: EmiCalculateResult;
};

/** GET /api/emi/tenures — calculator defaults + tenure list. */
export async function getEmiDefaults(
  signal?: AbortSignal,
): Promise<EmiDefaults> {
  const res = await publicApi<EmiDefaultsResponse>("/api/emi/tenures", {
    signal,
  });
  const raw = (res?.data ?? {}) as Partial<EmiDefaults> & Record<string, unknown>;
  const tenures = Array.isArray(raw.tenures)
    ? raw.tenures.map(Number).filter((n) => Number.isFinite(n) && n > 0)
    : [12, 24, 36, 48, 60];

  return {
    tenures: tenures.length ? tenures : [12, 24, 36, 48, 60],
    defaultInterestRate: Number(raw.defaultInterestRate) || 10,
    defaultDownPaymentPercent: Number(raw.defaultDownPaymentPercent) || 20,
    defaultTenureMonths: Number(raw.defaultTenureMonths) || 36,
  };
}

/** POST /api/emi/calculate — server-side reducing-balance EMI. */
export async function calculateEmiApi(
  input: EmiCalculateInput,
  signal?: AbortSignal,
): Promise<EmiCalculateResult> {
  const res = await publicApi<EmiCalculateResponse>("/api/emi/calculate", {
    method: "POST",
    body: JSON.stringify({
      vehiclePrice: input.vehiclePrice,
      productPrice: input.vehiclePrice,
      downPayment: input.downPayment,
      interestRate: input.interestRate,
      annualInterestRate: input.interestRate,
      tenure: input.tenureMonths,
      tenureMonths: input.tenureMonths,
    }),
    signal,
  });
  const raw = (res?.data ?? {}) as Partial<EmiCalculateResult>;
  const monthly = Number(raw.monthlyEmi ?? raw.monthlyEMI) || 0;
  return {
    vehiclePrice: Number(raw.vehiclePrice) || input.vehiclePrice,
    productPrice: Number(raw.productPrice ?? raw.vehiclePrice) || input.vehiclePrice,
    downPayment: Number(raw.downPayment) || input.downPayment,
    loanAmount: Number(raw.loanAmount) || 0,
    principalAmount: Number(raw.principalAmount ?? raw.loanAmount) || 0,
    interestRate: Number(raw.interestRate ?? raw.annualInterestRate) || input.interestRate,
    annualInterestRate:
      Number(raw.annualInterestRate ?? raw.interestRate) || input.interestRate,
    tenure: Number(raw.tenure ?? raw.tenureMonths) || input.tenureMonths,
    tenureMonths: Number(raw.tenureMonths ?? raw.tenure) || input.tenureMonths,
    monthlyEmi: monthly,
    monthlyEMI: monthly,
    totalInterest: Number(raw.totalInterest) || 0,
    totalPayable: Number(raw.totalPayable) || 0,
  };
}
