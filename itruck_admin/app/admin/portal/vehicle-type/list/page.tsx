"use client";

import dynamic from "next/dynamic";
import Box from "@mui/material/Box";
import CircularProgress from "@mui/material/CircularProgress";

const VehicleTypesPage = dynamic(
  () => import("../_components/vehicleTypeList/VehicleTypesPage").then((m) => ({ default: m.VehicleTypesPage })),
  {
    loading: () => (
      <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: 320 }}>
        <CircularProgress />
      </Box>
    ),
  }
);

export default function VehicleTypeListRoutePage() {
  return <VehicleTypesPage />;
}
