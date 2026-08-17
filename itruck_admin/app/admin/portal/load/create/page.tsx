"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Alert from "@mui/material/Alert";
import { LoadForm } from "../_components/loadForm/loadForm";
import { getLoad, type Load } from "@/model/api";
import { routes } from "@/lib/routes";
import { BackButton } from "@/components/common";
import { PageContainer, Spinner } from "@/components/ui";

function LoadCreateContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const fromId = searchParams?.get("from") || "";
  const reason = searchParams?.get("reason") || "";
  const [sourceLoad, setSourceLoad] = useState<Load | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!fromId) return;
    setLoading(true);
    setError("");
    getLoad(fromId)
      .then((data) => {
        const base = data as Load;
        const desc = base.description || "";
        const nextDesc = reason && !desc ? reason : desc;
        setSourceLoad({ ...base, description: nextDesc });
      })
      .catch((err) => {
        const msg =
          err instanceof Error ? err.message : "Failed to load source load";
        setError(msg);
      })
      .finally(() => setLoading(false));
  }, [fromId, reason]);

  if (fromId) {
    if (loading) {
      return (
        <PageContainer>
          <Spinner label="Loading source load…" />
        </PageContainer>
      );
    }
    if (error && !sourceLoad) {
      return (
        <PageContainer maxWidth={800}>
          <Alert severity="error" sx={{ mb: 2.5 }}>{error}</Alert>
          <BackButton fallback={routes.load.list()} label="Back to list" />
        </PageContainer>
      );
    }
    if (sourceLoad) {
      return <LoadForm load={sourceLoad} mode="create" />;
    }
  }

  return <LoadForm mode="create" />;
}

export default function LoadCreatePage() {
  return (
    <Suspense
      fallback={
        <PageContainer>
          <Spinner label="Loading form…" />
        </PageContainer>
      }
    >
      <LoadCreateContent />
    </Suspense>
  );
}
