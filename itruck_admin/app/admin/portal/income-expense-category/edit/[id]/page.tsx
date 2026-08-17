"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Alert from "@mui/material/Alert";
import { getIncomeExpenseCategory, type IncomeExpenseCategory } from "@/model/api";
import { routes } from "@/lib/routes";
import { IncomeExpenseCategoryForm } from "../../_components/incomeExpenseCategoryForm/incomeExpenseCategoryForm";
import { BackButton } from "@/components/common";
import { PageContainer, Spinner } from "@/components/ui";

export default function IncomeExpenseCategoryEditPage() {
  const params = useParams();
  const router = useRouter();
  const id = typeof params?.id === "string" ? params.id : "";
  const [category, setCategory] = useState<IncomeExpenseCategory | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!id) {
      router.replace(routes.incomeExpenseCategory.list());
      return;
    }
    getIncomeExpenseCategory(id)
      .then((c) => setCategory(c as IncomeExpenseCategory))
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load"))
      .finally(() => setLoading(false));
  }, [id, router]);

  if (!id) return null;
  if (loading) {
    return (
      <PageContainer>
        <Spinner label="Loading category…" />
      </PageContainer>
    );
  }
  if (!category) {
    return (
      <PageContainer maxWidth={800}>
        <Alert severity="error" sx={{ mb: 2.5 }}>{error || "Category not found."}</Alert>
        <BackButton fallback={routes.incomeExpenseCategory.list()} label="Back to list" />
      </PageContainer>
    );
  }

  return <IncomeExpenseCategoryForm category={category} mode="edit" />;
}
