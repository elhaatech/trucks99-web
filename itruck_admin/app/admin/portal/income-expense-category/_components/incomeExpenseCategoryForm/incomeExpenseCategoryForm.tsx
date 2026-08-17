"use client";

import { useEffect, useMemo, useState } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Alert from "@mui/material/Alert";
import { useRouter } from "next/navigation";

import {
  getCurrentUser,
  createIncomeExpenseCategory,
  updateIncomeExpenseCategory,
  getRowId,
  type IncomeExpenseCategory,
  type User,
} from "@/model/api";
import { routes } from "@/lib/routes";
import {
  BackButton,
  FormFooter,
  FormPageLayout,
  FormSelectField,
  FormTextField,
} from "@/components/common";
import { useForm } from "@/hooks/useForm";
import { useNotification } from "@/hooks/useNotification";

import type { FormState } from "../interface/incomeExpenseCategoryTypes";
import { EMPTY_FORM } from "../interface/incomeExpenseCategoryTypes";

export interface IncomeExpenseCategoryFormProps {
  category?: IncomeExpenseCategory;
  mode?: "create" | "edit";
  onSuccess?: () => void;
}

const FORM_ID = "income-expense-category-form";

export function IncomeExpenseCategoryForm({
  category,
  mode,
  onSuccess,
}: IncomeExpenseCategoryFormProps) {
  const effectiveMode: "create" | "edit" =
    mode ?? (category ? "edit" : "create");
  const isEdit = effectiveMode === "edit";

  const { notify } = useNotification();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const router = useRouter();

  const { values, setFieldValue } = useForm<FormState>(EMPTY_FORM);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    getCurrentUser()
      .then((u) => setCurrentUser(u as User))
      .catch(() => setCurrentUser(null));
  }, []);

  useEffect(() => {
    if (!category) return;
    setFieldValue("type", category.type === "expense" ? "expense" : "income");
    setFieldValue("categoryName", category.categoryName || "");
    setFieldValue(
      "status",
      category.status === "Inactive" ? "Inactive" : "Active",
    );
  }, [category, setFieldValue]);

  const typeOptions = useMemo(
    () => [
      { value: "income", label: "Income" },
      { value: "expense", label: "Expense" },
    ],
    [],
  );

  const statusOptions = useMemo(
    () => [
      { value: "Active", label: "Active" },
      { value: "Inactive", label: "Inactive" },
    ],
    [],
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const categoryName = values.categoryName.trim();
    if (!categoryName) {
      const msg = "Category name is required";
      setError(msg);
      notify({ type: "error", message: msg });
      return;
    }

    const userPayload = currentUser
      ? { name: currentUser.name, role: currentUser.role }
      : undefined;

    setSubmitting(true);
    try {
      if (isEdit && category) {
        await updateIncomeExpenseCategory(getRowId(category), {
          type: values.type,
          categoryName,
          status: values.status,
          user: userPayload,
        });
        notify({ type: "success", message: "Category updated successfully." });
      } else {
        await createIncomeExpenseCategory({
          type: values.type,
          categoryName,
          status: values.status,
          user: userPayload,
        });
        notify({ type: "success", message: "Category created successfully." });
      }

      onSuccess
        ? onSuccess()
        : router.push(routes.incomeExpenseCategory.list());
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : isEdit
            ? "Failed to update"
            : "Failed to create category";
      setError(msg);
      notify({ type: "error", message: msg });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <FormPageLayout
      title={isEdit ? "Edit Category" : "Create Category"}
      subtitle={isEdit ? category?.categoryName : "Add an income or expense category."}
      breadcrumbs={[
        { label: "Dashboard", href: routes.dashboard() },
        { label: "Income & Expense Categories", href: routes.incomeExpenseCategory.list() },
        { label: isEdit ? "Edit" : "Create" },
      ]}
      backButton={<BackButton fallback={routes.incomeExpenseCategory.list()} label="Back to list" />}
      footer={
        <FormFooter
          formId={FORM_ID}
          submitting={submitting}
          submitLabel={isEdit ? "Update" : "Create"}
          submittingLabel={isEdit ? "Updating…" : "Creating…"}
          onCancel={() => router.push(routes.incomeExpenseCategory.list())}
        />
      }
    >
      {error ? (
        <Alert severity="error" onClose={() => setError("")} sx={{ mb: 2.5 }}>
          {error}
        </Alert>
      ) : null}

      <Box
        component="form"
        id={FORM_ID}
        onSubmit={handleSubmit}
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", sm: "repeat(2, minmax(0, 1fr))" },
          gap: 2.5,
          "& > *": { minWidth: 0 },
          "& .fullWidth": { gridColumn: "1 / -1" },
        }}
      >
          <FormSelectField
            label="Type"
            value={values.type}
            onChange={(v) =>
              setFieldValue("type", (v as "income" | "expense") ?? "income")
            }
            options={typeOptions}
            required
          />

          <FormTextField
            label="Category name"
            value={values.categoryName}
            onChange={(v) => setFieldValue("categoryName", v)}
            required
          />

          <FormSelectField
            label="Status"
            value={values.status}
            onChange={(v) =>
              setFieldValue("status", (v as "Active" | "Inactive") ?? "Active")
            }
            options={statusOptions}
            required
          />

      </Box>
    </FormPageLayout>
  );
}

export default IncomeExpenseCategoryForm;
