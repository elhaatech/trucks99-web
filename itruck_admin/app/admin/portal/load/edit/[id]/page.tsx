"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Alert from "@mui/material/Alert";
import { LoadForm } from "../../_components/loadForm/loadForm";
import { getLoad, type Load } from "@/model/api";
import { routes } from "@/lib/routes";
import { BackButton } from "@/components/common";
import { PageContainer, Spinner } from "@/components/ui";

export default function LoadEditPage() {
  const params = useParams();
  const router = useRouter();
  const id = typeof params?.id === "string" ? params.id : "";

  const [load, setLoad] = useState<Load | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!id) {
      router.replace(routes.load.list());
      return;
    }
    getLoad(id)
      .then((data) => setLoad(data as Load))
      .catch((err) =>
        setError(err instanceof Error ? err.message : "Failed to load"),
      )
      .finally(() => setLoading(false));
  }, [id, router]);

  if (!id) return null;

  if (loading) {
    return (
      <PageContainer>
        <Spinner label="Loading load…" />
      </PageContainer>
    );
  }

  if (!load) {
    return (
      <PageContainer maxWidth={800}>
        <Alert severity="error" sx={{ mb: 2.5 }}>
          {error || "Load not found."}
        </Alert>
        <BackButton fallback={routes.load.list()} label="Back to list" />
      </PageContainer>
    );
  }

  return <LoadForm load={load} mode="edit" />;
}
