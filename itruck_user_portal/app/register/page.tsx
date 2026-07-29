import { Suspense } from "react";
import MarketplaceRegisterPage from "./RegisterPageContent";

export default function RegisterRoutePage() {
  return (
    <Suspense fallback={null}>
      <MarketplaceRegisterPage />
    </Suspense>
  );
}
