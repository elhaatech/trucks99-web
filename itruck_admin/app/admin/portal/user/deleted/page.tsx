"use client";

import dynamic from "next/dynamic";
import Box from "@mui/material/Box";
import CircularProgress from "@mui/material/CircularProgress";

const DeletedUsersPage = dynamic(
  () => import("../_components/userList/DeletedUsersPage").then((m) => ({ default: m.DeletedUsersPage })),
  {
    loading: () => (
      <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: 320 }}>
        <CircularProgress />
      </Box>
    ),
  }
);

export default function Page() {
  return <DeletedUsersPage />;
}
