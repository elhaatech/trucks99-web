"use client";

import { Suspense } from "react";
import { SpecificationValueForm } from "../../_components/SpecificationValueForm";
import { PageContainer, Spinner } from "@/components/ui";

export default function SpecificationValueCreatePage() {
  return (
    <Suspense fallback={<PageContainer><Spinner label="Loading form…" /></PageContainer>}>
      <SpecificationValueForm mode="create" />
    </Suspense>
  );
}
