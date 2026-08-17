"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Alert from "@mui/material/Alert";
import { getSpecificationValue, type SpecificationValue } from "@/model/api";
import { routes } from "@/lib/routes";
import { SpecificationValueForm } from "../../_components/SpecificationValueForm";
import { BackButton } from "@/components/common";
import { PageContainer, Spinner } from "@/components/ui";

export default function SpecificationValueEditPage() {
  const params = useParams();
  const router = useRouter();
  const id = typeof params?.id === "string" ? params.id : "";
  const [item, setItem] = useState<SpecificationValue | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!id) {
      router.replace(routes.specificationValue.list());
      return;
    }
    getSpecificationValue(id)
      .then(setItem)
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load"))
      .finally(() => setLoading(false));
  }, [id, router]);

  if (!id) return null;
  if (loading) {
    return (
      <PageContainer>
        <Spinner label="Loading specification value…" />
      </PageContainer>
    );
  }
  if (!item) {
    return (
      <PageContainer maxWidth={800}>
        <Alert severity="error" sx={{ mb: 2.5 }}>{error || "Specification value not found."}</Alert>
        <BackButton fallback={routes.specificationValue.list()} label="Back to list" />
      </PageContainer>
    );
  }

  return <SpecificationValueForm mode="edit" item={item} />;
}
