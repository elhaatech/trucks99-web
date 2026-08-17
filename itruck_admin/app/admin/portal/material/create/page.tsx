"use client";

import { Suspense } from "react";
import { MaterialForm } from "../_components/materialForm/materialForm";
import { PageContainer, Spinner } from "@/components/ui";

export default function MaterialCreatePage() {
  return (
    <Suspense
      fallback={
        <PageContainer>
          <Spinner label="Loading form…" />
        </PageContainer>
      }
    >
      <MaterialForm mode="create" />
    </Suspense>
  );
}
