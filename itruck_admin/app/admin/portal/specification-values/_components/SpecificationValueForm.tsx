"use client";

import { useEffect, useState } from "react";
import { Alert, Box, CircularProgress } from "@mui/material";
import { Controller, useForm } from "react-hook-form";
import { useRouter, useParams } from "next/navigation";
import {
  CategorySubcategorySelector,
  FormFooter,
  FormSelectField,
  FormTextField,
} from "@/components/common";
import { PageHeader } from "@/components/ui";
import {
  createSpecificationValue,
  getRowId,
  getSpecifications,
  updateSpecificationValue,
  type ActiveInactive,
  type Specification,
  type SpecificationValue,
} from "@/model/api";
import {
  getCategories,
  getCategoryRowId,
  getCategoryUuid,
} from "@/model/services/category";
import { getSubCategory, getSubCategoryRowId } from "@/model/services/sub-category";
import { useNotification } from "@/hooks/useNotification";
import { routes } from "@/lib/routes";

type FormData = {
  specification_id: string;
  category_id: string;
  subcategory_id: string;
  specification_value_name: string;
  status: ActiveInactive;
};

const FORM_ID = "specification-value-form";

export function SpecificationValueForm({
  item,
  mode,
}: {
  item?: SpecificationValue;
  mode: "create" | "edit";
}) {
  const isEdit = mode === "edit";
  const router = useRouter();
  const params = useParams();

  const specificationIdFromUrl = params?.id as string | undefined;

  const { notify } = useNotification();
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [specifications, setSpecifications] = useState<Specification[]>([]);
  const [specsLoading, setSpecsLoading] = useState(true);
  const [specsLoaded, setSpecsLoaded] = useState(false);
  const [editPrefillLoading, setEditPrefillLoading] = useState(isEdit);

  const { control, handleSubmit, setValue, watch } = useForm<FormData>({
    defaultValues: {
      specification_id: "",
      category_id: "",
      subcategory_id: "",
      specification_value_name: item?.specification_value_name || "",
      status: item?.status || "Active",
    },
  });

  const categoryId = watch("category_id");
  const subcategoryId = watch("subcategory_id");

  useEffect(() => {
    setSpecsLoading(true);
    getSpecifications({})
      .then((data) => {
        setSpecifications(data);
        setSpecsLoaded(true);
      })
      .catch(() => {
        setSpecifications([]);
        setSpecsLoaded(true);
      })
      .finally(() => setSpecsLoading(false));
  }, []);

  useEffect(() => {
    if (!specsLoaded) return;

    if (isEdit) {
      const editSpecId =
        item?.specification?.id ||
        item?.specification?._id ||
        item?.specification_id ||
        "";
      if (editSpecId) setValue("specification_id", editSpecId);
    } else if (specificationIdFromUrl) {
      setValue("specification_id", specificationIdFromUrl);
    }
  }, [specsLoaded, isEdit, item, specificationIdFromUrl, setValue]);

  // Resolve parent category from the saved subcategory when editing.
  useEffect(() => {
    if (!isEdit || !item?.subcategory_id) {
      setEditPrefillLoading(false);
      return;
    }

    let cancelled = false;
    setEditPrefillLoading(true);

    Promise.all([
      getSubCategory(String(item.subcategory_id)),
      getCategories({ activeOnly: true }),
    ])
      .then(([subcategory, categories]) => {
        if (cancelled) return;

        const parentCategory = categories.find(
          (category) =>
            getCategoryUuid(category) === subcategory.category_id ||
            getCategoryRowId(category) === subcategory.category_id,
        );

        if (parentCategory) {
          setValue("category_id", getCategoryRowId(parentCategory));
        }
        setValue("subcategory_id", getSubCategoryRowId(subcategory));
      })
      .catch(() => {
        if (!cancelled) {
          setValue("subcategory_id", String(item.subcategory_id));
        }
      })
      .finally(() => {
        if (!cancelled) setEditPrefillLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [isEdit, item, setValue]);

  const specificationOptions = specifications.map((spec) => ({
    value: getRowId(spec),
    label: spec.specification_name,
  }));

  const onSubmit = handleSubmit(async (values) => {
    setError("");
    try {
      setSubmitting(true);

      if (!values.specification_id || !values.specification_value_name.trim()) {
        throw new Error("Specification and value name are required.");
      }
      if (!values.category_id) {
        throw new Error("Category is required.");
      }
      if (!values.subcategory_id) {
        throw new Error("Sub category is required.");
      }

      if (isEdit && item) {
        await updateSpecificationValue(getRowId(item), {
          specification_id: values.specification_id,
          subcategory_id: values.subcategory_id,
          specification_value_name: values.specification_value_name.trim(),
          status: values.status,
        });
        notify({ type: "success", message: "Specification value updated successfully." });
      } else {
        await createSpecificationValue({
          specification_id: values.specification_id,
          subcategory_id: values.subcategory_id,
          specification_value_name: values.specification_value_name.trim(),
        });
        notify({ type: "success", message: "Specification value created successfully." });
      }

      const redirectId = values.specification_id;
      router.push(`/admin/portal/specification-values/list/${redirectId}`);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to save specification value";
      setError(msg);
      notify({ type: "error", message: msg });
    } finally {
      setSubmitting(false);
    }
  });

  const loading = specsLoading || editPrefillLoading;

  return (
    <Box sx={{ px: 4, py: 4, bgcolor: "background.paper", borderRadius: 2, boxShadow: 1 }}>
      <PageHeader
        title={isEdit ? "Edit Specification Value" : "Create Specification Value"}
        subtitle={
          isEdit ? item?.specification_value_name : "Add a new specification value."
        }
      />

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError("")}>
          {error}
        </Alert>
      )}

      {loading ? (
        <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
          <CircularProgress size={32} />
        </Box>
      ) : (
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
            name="specification_id"
            render={({ field }) => (
              <FormSelectField
                label="Specification"
                value={field.value}
                onChange={(v) => field.onChange(String(v || ""))}
                options={specificationOptions}
                disabled={!isEdit && !!specificationIdFromUrl}
                required
              />
            )}
          />

          <CategorySubcategorySelector
            variant="form"
            categoryId={categoryId}
            subcategoryId={subcategoryId}
            onCategoryChange={(id) => setValue("category_id", id)}
            onSubcategoryChange={(id) => setValue("subcategory_id", id)}
            required
          />

          <Controller
            control={control}
            name="specification_value_name"
            rules={{ required: "Value name is required" }}
            render={({ field }) => (
              <FormTextField
                label="Value Name"
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
              onCancel={() =>
                specificationIdFromUrl
                  ? router.push(`/admin/portal/specification-values/list/${specificationIdFromUrl}`)
                  : router.push(routes.specificationValue.list())
              }
            />
          </Box>
        </Box>
      )}
    </Box>
  );
}
