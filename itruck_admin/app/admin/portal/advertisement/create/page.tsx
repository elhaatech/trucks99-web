"use client";

import { Suspense } from "react";
import Box from "@mui/material/Box";
import { AdvertisementForm } from "../_components/advertisementForm/advertisementForm";

export default function AdvertisementCreatePage() {
  return (
    <Suspense fallback={<Box sx={{ p: 2 }}>Loading…</Box>}>
      <AdvertisementForm mode="create" />
    </Suspense>
  );
}
