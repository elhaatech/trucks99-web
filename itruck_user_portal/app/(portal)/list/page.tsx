import { Suspense } from "react";
import Box from "@mui/material/Box";
import { VehicleGridSkeleton, VehicleListHeader } from "@/app/common/components/buysell";
import UserProductListContent from "./ListPageContent";

function ListPageFallback() {
  return (
    <Box sx={{ width: "100%" }}>
      <VehicleListHeader count={0} title="All Vehicles" loading />
      <VehicleGridSkeleton count={6} />
    </Box>
  );
}

export default function UserProductListPage() {
  return (
    <Suspense fallback={<ListPageFallback />}>
      <UserProductListContent />
    </Suspense>
  );
}
