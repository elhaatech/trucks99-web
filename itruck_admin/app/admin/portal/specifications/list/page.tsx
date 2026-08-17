"use client";

import dynamic from "next/dynamic";
import Box from "@mui/material/Box";
import CircularProgress from "@mui/material/CircularProgress";

const SpecificationsPage = dynamic(
  () => import("../_components/SpecificationsPage").then((m) => ({ default: m.SpecificationsPage })),
  {
    loading: () => (
      <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: 320 }}>
        <CircularProgress />
      </Box>
    ),
  }
);

export default function SpecificationsListRoutePage() {
  return <SpecificationsPage />;
}
