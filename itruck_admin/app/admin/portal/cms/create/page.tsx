"use client";

import { Suspense } from "react";
import Box from "@mui/material/Box";
import { CMSForm } from "../components/cmsForm/cmsForm";

export default function CMSCreatePage() {
  return (
    <Suspense fallback={<Box sx={{ p: 2 }}>Loading…</Box>}>
      <CMSForm mode="create" />
    </Suspense>
  );
}