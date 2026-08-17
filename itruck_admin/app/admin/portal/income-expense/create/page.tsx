"use client";

import { Suspense } from "react";
import { IncomeExpenseForm } from "../_components/incomeExpenseForm/incomeExpenseForm";
import { PageContainer, Spinner } from "@/components/ui";

export default function IncomeExpenseCreatePage() {
  return (
    <Suspense fallback={<PageContainer><Spinner label="Loading form…" /></PageContainer>}>
      <IncomeExpenseForm mode="create" />
    </Suspense>
  );
}
