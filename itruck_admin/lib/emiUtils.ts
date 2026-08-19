/** Format INR amounts for display. */
export function formatInr(amount: number): string {
  return `₹${Math.round(amount).toLocaleString("en-IN")}`;
}

export type EmiCalculationInput = {
  vehiclePrice: number;
  downPayment: number;
  annualInterestRate: number;
  tenureMonths: number;
};

export type EmiCalculationResult = {
  monthlyEmi: number;
  totalPayable: number;
  totalInterest: number;
  principalAmount: number;
  loanAmount: number;
};

export const EMPTY_EMI_RESULT: EmiCalculationResult = {
  monthlyEmi: 0,
  totalPayable: 0,
  totalInterest: 0,
  principalAmount: 0,
  loanAmount: 0,
};

/** Standard reducing-balance EMI formula. */
export function calculateEmi(input: EmiCalculationInput): EmiCalculationResult {
  const vehiclePrice = Math.max(0, input.vehiclePrice);
  const downPayment = Math.min(Math.max(0, input.downPayment), vehiclePrice);
  const tenureMonths = Math.max(1, Math.floor(input.tenureMonths));
  const annualRate = Math.max(0, input.annualInterestRate);
  const loanAmount = vehiclePrice - downPayment;
  const principalAmount = loanAmount;

  if (loanAmount <= 0) {
    return {
      monthlyEmi: 0,
      totalPayable: downPayment,
      totalInterest: 0,
      principalAmount: 0,
      loanAmount: 0,
    };
  }

  const monthlyRate = annualRate / 12 / 100;

  let monthlyEmi: number;
  if (monthlyRate === 0) {
    monthlyEmi = loanAmount / tenureMonths;
  } else {
    const factor = Math.pow(1 + monthlyRate, tenureMonths);
    monthlyEmi = (loanAmount * monthlyRate * factor) / (factor - 1);
  }

  const totalPayable = downPayment + monthlyEmi * tenureMonths;
  const totalInterest = totalPayable - vehiclePrice;

  return {
    monthlyEmi: Math.round(monthlyEmi),
    totalPayable: Math.round(totalPayable),
    totalInterest: Math.max(0, Math.round(totalInterest)),
    principalAmount: Math.round(principalAmount),
    loanAmount: Math.round(loanAmount),
  };
}
