"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Alert from "@mui/material/Alert";
import { getCompanyStartCountry, type CompanyStartCountry } from "@/model/api";
import { routes } from "@/lib/routes";
import { CompanyStartCountryForm } from "../../_components/companyStartCountryForm/CompanyStartCountryForm";
import { BackButton } from "@/components/common";
import { PageContainer, Spinner } from "@/components/ui";

export default function CompanyStartCountryEditPage() {
  const params = useParams();
  const router = useRouter();
  const id = typeof params?.id === "string" ? params.id : "";
  const [item, setItem] = useState<CompanyStartCountry | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!id) {
      router.replace(routes.companyStartCountry.list());
      return;
    }
    getCompanyStartCountry(id)
      .then((v) => setItem(v as CompanyStartCountry))
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load"))
      .finally(() => setLoading(false));
  }, [id, router]);

  if (!id) return null;
  if (loading) {
    return (
      <PageContainer>
        <Spinner label="Loading location…" />
      </PageContainer>
    );
  }
  if (!item) {
    return (
      <PageContainer maxWidth={800}>
        <Alert severity="error" sx={{ mb: 2.5 }}>{error || "Location not found."}</Alert>
        <BackButton fallback={routes.companyStartCountry.list()} label="Back to list" />
      </PageContainer>
    );
  }

  return <CompanyStartCountryForm companyStartCountry={item} mode="edit" />;
}
