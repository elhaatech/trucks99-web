"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Alert from "@mui/material/Alert";
import { getIncomeExpense, type IncomeExpense } from "@/model/api";
import { routes } from "@/lib/routes";
import { IncomeExpenseForm } from "../../_components/incomeExpenseForm/incomeExpenseForm";
import { BackButton } from "@/components/common";
import { PageContainer, Spinner } from "@/components/ui";

export default function IncomeExpenseEditPage() {
  const params = useParams();
  const router = useRouter();
  const id = typeof params?.id === "string" ? params.id : "";
  const [item, setItem] = useState<IncomeExpense | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!id) {
      router.replace(routes.incomeExpense.list());
      return;
    }
    getIncomeExpense(id)
      .then((e) => setItem(e as IncomeExpense))
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load"))
      .finally(() => setLoading(false));
  }, [id, router]);

  if (!id) return null;
  if (loading) {
    return (
      <PageContainer>
        <Spinner label="Loading entry…" />
      </PageContainer>
    );
  }
  if (!item) {
    return (
      <PageContainer maxWidth={800}>
        <Alert severity="error" sx={{ mb: 2.5 }}>{error || "Entry not found."}</Alert>
        <BackButton fallback={routes.incomeExpense.list()} label="Back to list" />
      </PageContainer>
    );
  }

  return <IncomeExpenseForm incomeExpense={item} mode="edit" />;
}
