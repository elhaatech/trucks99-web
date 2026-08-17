"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Alert from "@mui/material/Alert";
import { getVehicleType, type VehicleType } from "@/model/api";
import { routes } from "@/lib/routes";
import { VehicleTypeForm } from "../../_components/vehicleTypeForm/vehicleTypeForm";
import { BackButton } from "@/components/common";
import { PageContainer, Spinner } from "@/components/ui";

export default function VehicleTypeEditPage() {
  const params = useParams();
  const router = useRouter();
  const id = typeof params?.id === "string" ? params.id : "";
  const [vehicleType, setVehicleType] = useState<VehicleType | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!id) {
      router.replace(routes.vehicleType.list());
      return;
    }
    getVehicleType(id)
      .then((v) => setVehicleType(v as VehicleType))
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load"))
      .finally(() => setLoading(false));
  }, [id, router]);

  if (!id) return null;
  if (loading) {
    return (
      <PageContainer>
        <Spinner label="Loading vehicle type…" />
      </PageContainer>
    );
  }
  if (!vehicleType) {
    return (
      <PageContainer maxWidth={800}>
        <Alert severity="error" sx={{ mb: 2.5 }}>{error || "Vehicle type not found."}</Alert>
        <BackButton fallback={routes.vehicleType.list()} label="Back to list" />
      </PageContainer>
    );
  }

  return <VehicleTypeForm vehicleType={vehicleType} mode="edit" />;
}
