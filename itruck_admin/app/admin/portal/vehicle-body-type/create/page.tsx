"use client";

import { Suspense } from "react";
import { VehicleBodyTypeForm } from "../_components/vehicleBodyTypeForm/vehicleBodyTypeForm";
import { PageContainer, Spinner } from "@/components/ui";

export default function VehicleBodyTypeCreatePage() {
  return (
    <Suspense fallback={<PageContainer><Spinner label="Loading form…" /></PageContainer>}>
      <VehicleBodyTypeForm mode="create" />
    </Suspense>
  );
}
