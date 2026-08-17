"use client";

import dynamic from "next/dynamic";
import Box from "@mui/material/Box";
import CircularProgress from "@mui/material/CircularProgress";

const VehicleBodyTypesPage = dynamic(
  () => import("../_components/vehicleBodyTypeList/VehicleBodyTypesPage").then((m) => ({ default: m.VehicleBodyTypesPage })),
  {
    loading: () => (
      <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: 320 }}>
        <CircularProgress />
      </Box>
    ),
  }
);

export default function VehicleBodyTypeListRoutePage() {
  return <VehicleBodyTypesPage />;
}
