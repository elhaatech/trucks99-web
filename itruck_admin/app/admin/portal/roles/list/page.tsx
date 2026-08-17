"use client";

import dynamic from "next/dynamic";
import Box from "@mui/material/Box";
import CircularProgress from "@mui/material/CircularProgress";

const RolesPage = dynamic(
  () => import("../_components/roleList/RolesPage").then((m) => ({ default: m.RolesPage })),
  {
    loading: () => (
      <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: 320 }}>
        <CircularProgress />
      </Box>
    ),
  }
);

export default function RolesListRoutePage() {
  return <RolesPage />;
}
