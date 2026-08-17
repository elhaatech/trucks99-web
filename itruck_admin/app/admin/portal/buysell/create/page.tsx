"use client";

import { Suspense } from "react";
import BuySellForm from "../_components/buysellcolumnsForm/buysellForm";
import { PageContainer, Spinner } from "@/components/ui";

export default function BuySellCreatePage() {
  return (
    <Suspense
      fallback={
        <PageContainer>
          <Spinner label="Loading form…" />
        </PageContainer>
      }
    >
      <BuySellForm mode="create" />
    </Suspense>
  );
}
