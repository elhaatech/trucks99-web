// app/admin/portal/category/list/[categoryId]/sub-category/edit/[id]/page.tsx

"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Alert, Box, Button } from "@mui/material";
import { routes } from "@/lib/routes";
import {
  type SubCategory,
  getSubCategory,
} from "@/model/services/sub-category";
import { SubCategoryForm } from "../../_components/sub-categoryform";

type Props = {
  params: Promise<{ categoryId: string; id: string }>;
};

export default function SubCategoryEditPage({ params }: Props) {
  const { categoryId, id } = use(params); // ✅ unwrap async params
  const router = useRouter();

  const [item, setItem] = useState<SubCategory | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!id || !categoryId) {
      router.replace(routes.subCategory.list(categoryId));
      return;
    }
    getSubCategory(id)
      .then(setItem)
      .catch((err) =>
        setError(err instanceof Error ? err.message : "Failed to load"),
      )
      .finally(() => setLoading(false));
  }, [id, categoryId, router]);

  if (!id || !categoryId) return null;
  if (loading) return <Box sx={{ p: 2 }}>Loading...</Box>;

  if (!item)
    return (
      <Box sx={{ p: 2 }}>
        <Alert severity="error">{error || "Sub-category not found."}</Alert>
        <Button
          sx={{ mt: 2 }}
          onClick={() => router.push(routes.subCategory.list(categoryId))}
        >
          Back to list
        </Button>
      </Box>
    );

  return (
    <Box sx={{ p: 2 }}>
      <SubCategoryForm
        mode="edit"
        item={item}
        categoryIdFromRoute={categoryId}
      />
    </Box>
  );
}
