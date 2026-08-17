"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Alert from "@mui/material/Alert";
import { getTruck, type Truck } from "@/model/api";
import { routes } from "@/lib/routes";
import TruckForm from "../../_components/truckForm/truckForm";
import { BackButton } from "@/components/common";
import { PageContainer, Spinner } from "@/components/ui";

export default function TruckEditPage() {
  const params = useParams();
  const router = useRouter();
  const id = typeof params?.id === "string" ? params.id : "";
  const [truck, setTruck] = useState<Truck | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!id) {
      router.replace(routes.truck.list());
      return;
    }

    getTruck(id)
      .then((t) => setTruck(t as Truck))
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load"))
      .finally(() => setLoading(false));
  }, [id, router]);

  if (!id) return null;

  if (loading) {
    return (
      <PageContainer>
        <Spinner label="Loading truck…" />
      </PageContainer>
    );
  }

  if (!truck) {
    return (
      <PageContainer maxWidth={800}>
        <Alert severity="error" sx={{ mb: 2.5 }}>
          {error || "Truck not found."}
        </Alert>
        <BackButton fallback={routes.truck.list()} label="Back to list" />
      </PageContainer>
    );
  }

  return <TruckForm truck={truck} />;
}
