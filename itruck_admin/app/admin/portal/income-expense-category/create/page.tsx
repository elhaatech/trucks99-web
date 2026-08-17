"use client";

import { Suspense } from "react";
import { IncomeExpenseCategoryForm } from "../_components/incomeExpenseCategoryForm/incomeExpenseCategoryForm";
import { PageContainer, Spinner } from "@/components/ui";

export default function IncomeExpenseCategoryCreatePage() {
  return (
    <Suspense fallback={<PageContainer><Spinner label="Loading form…" /></PageContainer>}>
      <IncomeExpenseCategoryForm mode="create" />
    </Suspense>
  );
}
