"use client";

import dynamic from "next/dynamic";
import Box from "@mui/material/Box";
import CircularProgress from "@mui/material/CircularProgress";

const UsersPage = dynamic(
  () => import("../_components/userList/UsersPage").then((m) => ({ default: m.UsersPage })),
  {
    loading: () => (
      <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: 320 }}>
        <CircularProgress />
      </Box>
    ),
  }
);

export default function UserListPage() {
  return <UsersPage />;
}
