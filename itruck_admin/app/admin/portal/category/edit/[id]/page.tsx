"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Alert, Box, Button } from "@mui/material";
import { routes } from "@/lib/routes";
import { type Category, getCategory } from "@/model/services/category";
import { CategoryForm } from "../../_components/Categoryform";

export default function CategoryEditPage() {
  const params = useParams();
  const router = useRouter();
  const id = typeof params?.id === "string" ? params.id : "";
  const [item, setItem] = useState<Category | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!id) {
      router.replace(routes.category.list());
      return;
    }
    getCategory(id)
      .then(setItem)
      .catch((err) =>
        setError(err instanceof Error ? err.message : "Failed to load"),
      )
      .finally(() => setLoading(false));
  }, [id, router]);

  if (!id) return null;
  if (loading) return <Box sx={{ p: 2 }}>Loading...</Box>;
  if (!item)
    return (
      <Box sx={{ p: 2 }}>
        <Alert severity="error">{error || "Category not found."}</Alert>
        <Button
          sx={{ mt: 2 }}
          onClick={() => router.push(routes.category.list())}
        >
          Back to list
        </Button>
      </Box>
    );

  return <CategoryForm mode="edit" item={item} />;
}
