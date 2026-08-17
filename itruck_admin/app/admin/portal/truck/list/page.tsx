"use client";

import dynamic from "next/dynamic";
import Box from "@mui/material/Box";
import CircularProgress from "@mui/material/CircularProgress";

const TrucksPage = dynamic(
  () => import("../_components/truckList/TrucksPage").then((m) => ({ default: m.TrucksPage })),
  {
    loading: () => (
      <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: 320 }}>
        <CircularProgress />
      </Box>
    ),
  }
);

export default function TruckListRoutePage() {
  return <TrucksPage />;
}
