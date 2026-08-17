"use client";

import dynamic from "next/dynamic";
import Box from "@mui/material/Box";
import CircularProgress from "@mui/material/CircularProgress";

const LoadsPage = dynamic(
  () =>
    import("../_components/loadList/LoadsPage").then((m) => ({
      default: m.LoadsPage,
    })),
  {
    loading: () => (
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          minHeight: 320,
        }}
      >
        <CircularProgress />
      </Box>
    ),
  },
);

export default function LoadListPage() {
  return <LoadsPage />;
}
