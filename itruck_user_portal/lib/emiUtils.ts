/** Format INR amounts for display. */
export function formatInr(amount: number): string {
  return `₹${Math.round(amount).toLocaleString("en-IN")}`;
}

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
