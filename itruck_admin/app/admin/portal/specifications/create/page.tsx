"use client";

import { Suspense } from "react";
import { SpecificationForm } from "../_components/SpecificationForm";
import { PageContainer, Spinner } from "@/components/ui";

export default function SpecificationCreatePage() {
  return (
    <Suspense fallback={<PageContainer><Spinner label="Loading form…" /></PageContainer>}>
      <SpecificationForm mode="create" />
    </Suspense>
  );
}
