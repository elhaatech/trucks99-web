"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Alert, Box } from "@mui/material";
import { Controller, useForm } from "react-hook-form";

import {
  FormFooter,
  FormSelectField,
  FormTextField,
} from "@/components/common";
import { PageHeader } from "@/components/ui";
import { routes } from "@/lib/routes";
import { useNotification } from "@/hooks/useNotification";
import {
  type SubCategory,
  createSubCategory,
  getSubCategoryRowId,
  updateSubCategory,
} from "@/model/services/sub-category";
import { type Category, getCategories } from "@/model/services/category";

type FormData = {
  sub_category_name: string;
  category_id: string;
};

const FORM_ID = "sub-category-form";

export function SubCategoryForm({
  item,
  mode,
  categoryIdFromRoute,
  categoryNameFromRoute,
}: {
  item?: SubCategory;
  mode: "create" | "edit";
  categoryIdFromRoute: string;
  categoryNameFromRoute?: string;
}) {
  const isEdit = mode === "edit";
  const router = useRouter();
  const { notify } = useNotification();

  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [resolvedCategoryName, setResolvedCategoryName] = useState("");

  const { control, handleSubmit, setValue } = useForm<FormData>({
    defaultValues: {
      sub_category_name: item?.sub_category_name ?? "",
      category_id: "",
    },
  });

  // Lock dropdown when creating
  const isCategoryLocked = !isEdit && !!categoryIdFromRoute;

  useEffect(() => {
    getCategories()
      .then((data) => {
        setCategories(data);

        // 🔍 find category using _id from route
        const matchedCategory = data.find((c) => c._id === categoryIdFromRoute);

        if (matchedCategory) {
          // ✅ Always set string (id or fallback _id)
          const safeId = matchedCategory.id ?? matchedCategory._id;

          setValue("category_id", safeId);
          setResolvedCategoryName(matchedCategory.category_name);
        }

        // ✅ Edit mode fix
        if (item?.category_id) {
          setValue("category_id", item.category_id);
        }
      })
      .catch(() =>
        notify({ type: "error", message: "Failed to load categories" }),
      );
  }, [categoryIdFromRoute, item, notify, setValue]);

  const backUrl = routes.subCategory.list(categoryIdFromRoute);

  const onSubmit = handleSubmit(async (values) => {
    setError("");

    try {
      setSubmitting(true);

      if (isEdit && item) {
        await updateSubCategory(getSubCategoryRowId(item), {
          sub_category_name: values.sub_category_name,
          category_id: values.category_id, // ✅ always string
        });

        notify({
          type: "success",
          message: "Sub-category updated successfully.",
        });
      } else {
        await createSubCategory({
          sub_category_name: values.sub_category_name,
          category_id: values.category_id, // ✅ always string
        });

        notify({
          type: "success",
          message: "Sub-category created successfully.",
        });
      }

      router.push(backUrl);
    } catch (e) {
      const msg =
        e instanceof Error ? e.message : "Failed to save sub-category";

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
        title={isEdit ? "Edit Sub-Category" : "Create Sub-Category"}
        subtitle={
          isEdit
            ? item?.sub_category_name
            : resolvedCategoryName
              ? `Add sub-category under "${resolvedCategoryName}"`
              : "Add a new sub-category."
        }
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
        {/* ✅ CATEGORY SELECT */}
        <Controller
          control={control}
          name="category_id"
          rules={{ required: "Category is required" }}
          render={({ field, fieldState }) => (
            <FormSelectField
              label="Category"
              value={field.value}
              onChange={(v) => field.onChange(v ?? "")}
              disabled={isCategoryLocked}
              helperText={
                fieldState.error?.message ??
                (isCategoryLocked && resolvedCategoryName
                  ? `Locked to "${resolvedCategoryName}"`
                  : undefined)
              }
              options={categories.map((cat) => ({
                value: cat.id ?? cat._id, // ✅ FIXED (no TS error)
                label: cat.category_name,
              }))}
            />
          )}
        />

        {/* ✅ SUB CATEGORY NAME */}
        <Controller
          control={control}
          name="sub_category_name"
          rules={{ required: "Sub-category name is required" }}
          render={({ field, fieldState }) => (
            <FormTextField
              label="Sub-Category Name"
              value={field.value}
              onChange={field.onChange}
              required
              error={!!fieldState.error}
              helperText={fieldState.error?.message}
            />
          )}
        />

        <Box sx={{ gridColumn: "1 / -1" }}>
          <FormFooter
            formId={FORM_ID}
            submitting={submitting}
            submitLabel={isEdit ? "Update" : "Create"}
            submittingLabel={isEdit ? "Updating..." : "Creating..."}
            onCancel={() => router.push(backUrl)}
          />
        </Box>
      </Box>
    </Box>
  );
}
