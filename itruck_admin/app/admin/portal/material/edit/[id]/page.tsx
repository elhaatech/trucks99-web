"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Alert from "@mui/material/Alert";
import { getMaterial, type Material } from "@/model/api";
import { routes } from "@/lib/routes";
import { MaterialForm } from "../../_components/materialForm/materialForm";
import { BackButton } from "@/components/common";
import { PageContainer, Spinner } from "@/components/ui";

export default function MaterialEditPage() {
  const params = useParams();
  const router = useRouter();
  const id = typeof params?.id === "string" ? params.id : "";
  const [material, setMaterial] = useState<Material | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!id) {
      router.replace(routes.material.list());
      return;
    }
    getMaterial(id)
      .then((m) => setMaterial(m as Material))
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load"))
      .finally(() => setLoading(false));
  }, [id, router]);

  if (!id) return null;

  if (loading) {
    return (
      <PageContainer>
        <Spinner label="Loading material…" />
      </PageContainer>
    );
  }

  if (!material) {
    return (
      <PageContainer maxWidth={800}>
        <Alert severity="error" sx={{ mb: 2.5 }}>
          {error || "Material not found."}
        </Alert>
        <BackButton fallback={routes.material.list()} label="Back to list" />
      </PageContainer>
    );
  }

  return <MaterialForm material={material} mode="edit" />;
}
