"use client";

import dynamic from "next/dynamic";
import Box from "@mui/material/Box";
import CircularProgress from "@mui/material/CircularProgress";

const MaterialsPage = dynamic(
  () => import("../_components/materialList/MaterialsPage").then((m) => ({ default: m.MaterialsPage })),
  {
    loading: () => (
      <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: 320 }}>
        <CircularProgress />
      </Box>
    ),
  }
);

export default function MaterialListPage() {
  return <MaterialsPage />;
}
