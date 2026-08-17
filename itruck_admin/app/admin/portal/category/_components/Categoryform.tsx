"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Alert, Box } from "@mui/material";
import { Controller, useForm } from "react-hook-form";

import { FormFooter, FormTextField } from "@/components/common";
import { PageHeader } from "@/components/ui";
import { routes } from "@/lib/routes";
import { useNotification } from "@/hooks/useNotification";
import {
  type Category,
  createCategory,
  getCategoryRowId,
  updateCategory,
} from "@/model/services/category";

type FormData = {
  category_name: string;
};

const FORM_ID = "category-form";

export function CategoryForm({
  item,
  mode,
}: {
  item?: Category;
  mode: "create" | "edit";
}) {
  const isEdit = mode === "edit";
  const router = useRouter();
  const { notify } = useNotification();
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const { control, handleSubmit } = useForm<FormData>({
    defaultValues: {
      category_name: item?.category_name || "",
    },
  });

  const onSubmit = handleSubmit(async (values) => {
    setError("");
    try {
      setSubmitting(true);
      if (isEdit && item) {
        await updateCategory(getCategoryRowId(item), {
          category_name: values.category_name,
        });
        notify({ type: "success", message: "Category updated successfully." });
      } else {
        await createCategory({ category_name: values.category_name });
        notify({ type: "success", message: "Category created successfully." });
      }
      router.push(routes.category.list());
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to save category";
      setError(msg);
      notify({ type: "error", message: msg });
    } finally {
      setSubmitting(false);
    }
  });

  return (
    <Box
      sx={{
        px: 4,
        py: 4,
        bgcolor: "background.paper",
        borderRadius: 2,
        boxShadow: 1,
      }}
    >
      <PageHeader
        title={isEdit ? "Edit Category" : "Create Category"}
        subtitle={isEdit ? item?.category_name : "Add a new category."}
      />

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError("")}>
          {error}
        </Alert>
      )}

      <Box
        component="form"
        id={FORM_ID}
        onSubmit={onSubmit}
        sx={{
          display: "grid",
          gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
          gap: 2,
        }}
      >
        <Controller
          control={control}
          name="category_name"
          rules={{ required: "Category name is required" }}
          render={({ field }) => (
            <FormTextField
              label="Category Name"
              value={field.value}
              onChange={field.onChange}
              required
            />
          )}
        />

        <Box sx={{ gridColumn: "1 / -1" }}>
          <FormFooter
            formId={FORM_ID}
            submitting={submitting}
            submitLabel={isEdit ? "Update" : "Create"}
            submittingLabel={isEdit ? "Updating..." : "Creating..."}
            onCancel={() => router.push(routes.category.list())}
          />
        </Box>
      </Box>
    </Box>
  );
}
