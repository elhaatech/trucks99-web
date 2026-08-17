"use client";

import { Suspense } from "react";
import dynamic from "next/dynamic";
import { PageContainer, Spinner } from "@/components/ui";

const CompanyStartCountryForm = dynamic(
  () =>
    import("../_components/companyStartCountryForm/CompanyStartCountryForm").then(
      (m) => ({ default: m.CompanyStartCountryForm }),
    ),
  { ssr: false },
);

export default function CompanyStartCountryCreatePage() {
  return (
    <Suspense fallback={<PageContainer><Spinner label="Loading form…" /></PageContainer>}>
      <CompanyStartCountryForm mode="create" />
    </Suspense>
  );
}
