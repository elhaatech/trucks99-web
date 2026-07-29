import { Suspense } from "react";
import MarketplaceLoginPage from "./LoginPageContent";

export default function LoginRoutePage() {
  return (
    <Suspense fallback={null}>
      <MarketplaceLoginPage />
    </Suspense>
  );
}
