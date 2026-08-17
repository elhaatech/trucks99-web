"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Alert from "@mui/material/Alert";
import { getVehicleBodyType, type VehicleBodyType } from "@/model/api";
import { routes } from "@/lib/routes";
import { VehicleBodyTypeForm } from "../../_components/vehicleBodyTypeForm/vehicleBodyTypeForm";
import { BackButton } from "@/components/common";
import { PageContainer, Spinner } from "@/components/ui";

export default function VehicleBodyTypeEditPage() {
  const params = useParams();
  const router = useRouter();
  const id = typeof params?.id === "string" ? params.id : "";
  const [vehicleBodyType, setVehicleBodyType] = useState<VehicleBodyType | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!id) {
      router.replace(routes.vehicleBodyType.list());
      return;
    }
    getVehicleBodyType(id)
      .then((v) => setVehicleBodyType(v as VehicleBodyType))
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load"))
      .finally(() => setLoading(false));
  }, [id, router]);

  if (!id) return null;
  if (loading) {
    return (
      <PageContainer>
        <Spinner label="Loading vehicle body type…" />
      </PageContainer>
    );
  }
  if (!vehicleBodyType) {
    return (
      <PageContainer maxWidth={800}>
        <Alert severity="error" sx={{ mb: 2.5 }}>{error || "Vehicle body type not found."}</Alert>
        <BackButton fallback={routes.vehicleBodyType.list()} label="Back to list" />
      </PageContainer>
    );
  }

  return <VehicleBodyTypeForm vehicleBodyType={vehicleBodyType} mode="edit" />;
}
