"use client";

import { Suspense } from "react";
import TruckForm from "../_components/truckForm/truckForm";
import { PageContainer, Spinner } from "@/components/ui";

export default function TruckCreatePage() {
  return (
    <Suspense
      fallback={
        <PageContainer>
          <Spinner label="Loading form…" />
        </PageContainer>
      }
    >
      <TruckForm />
    </Suspense>
  );
}
