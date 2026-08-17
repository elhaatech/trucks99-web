"use client";

import dynamic from "next/dynamic";
import Box from "@mui/material/Box";
import CircularProgress from "@mui/material/CircularProgress";

const PermissionsPage = dynamic(
  () => import("./_components/PermissionsPage").then((m) => ({ default: m.PermissionsPage })),
  {
    loading: () => (
      <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: 320 }}>
        <CircularProgress />
      </Box>
    ),
  }
);

export default function PermissionsListRoutePage() {
  return <PermissionsPage />;
}
