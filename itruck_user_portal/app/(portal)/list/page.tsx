import { Suspense } from "react";
import { Spinner } from "@/components/ui";
import UserProductListContent from "./ListPageContent";

export default function UserProductListPage() {
  return (
    <Suspense fallback={<Spinner label="Loading vehicles…" />}>
      <UserProductListContent />
    </Suspense>
  );
}
