"use client";

import { Suspense } from "react";
import Box from "@mui/material/Box";
import { UserForm } from "../_components/userForm/userForm";

export default function UserCreatePage() {
  return (
    <Suspense fallback={<Box sx={{ p: 2 }}>Loading…</Box>}>
      <UserForm mode="create" />
    </Suspense>
  );
}
