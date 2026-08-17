"use client";

import { Suspense } from "react";
import { VehicleTypeForm } from "../_components/vehicleTypeForm/vehicleTypeForm";
import { PageContainer, Spinner } from "@/components/ui";

export default function VehicleTypeCreatePage() {
  return (
    <Suspense fallback={<PageContainer><Spinner label="Loading form…" /></PageContainer>}>
      <VehicleTypeForm mode="create" />
    </Suspense>
  );
}
