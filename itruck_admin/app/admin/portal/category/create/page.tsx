"use client";

import { Suspense } from "react";
import Box from "@mui/material/Box";
import { CategoryForm } from "../_components/Categoryform";

export default function CategoryCreatePage() {
  return (
    <Suspense fallback={<Box sx={{ p: 2 }}>Loading...</Box>}>
      <CategoryForm mode="create" />
    </Suspense>
  );
}
