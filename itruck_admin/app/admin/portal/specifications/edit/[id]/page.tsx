"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Alert from "@mui/material/Alert";
import { getSpecification, type Specification } from "@/model/api";
import { routes } from "@/lib/routes";
import { SpecificationForm } from "../../_components/SpecificationForm";
import { BackButton } from "@/components/common";
import { PageContainer, Spinner } from "@/components/ui";

export default function SpecificationEditPage() {
  const params = useParams();
  const router = useRouter();
  const id = typeof params?.id === "string" ? params.id : "";
  const [item, setItem] = useState<Specification | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!id) {
      router.replace(routes.specification.list());
      return;
    }
    getSpecification(id)
      .then(setItem)
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load"))
      .finally(() => setLoading(false));
  }, [id, router]);

  if (!id) return null;
  if (loading) {
    return (
      <PageContainer>
        <Spinner label="Loading specification…" />
      </PageContainer>
    );
  }
  if (!item) {
    return (
      <PageContainer maxWidth={800}>
        <Alert severity="error" sx={{ mb: 2.5 }}>{error || "Specification not found."}</Alert>
        <BackButton fallback={routes.specification.list()} label="Back to list" />
      </PageContainer>
    );
  }

  return <SpecificationForm mode="edit" item={item} />;
}
