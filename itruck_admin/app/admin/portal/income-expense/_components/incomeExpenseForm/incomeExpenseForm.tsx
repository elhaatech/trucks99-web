"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Alert from "@mui/material/Alert";

import {
  getCurrentUser,
  getIncomeExpenseCategoryAll,
  getRowId,
  getUserAll,
  createIncomeExpense,
  updateIncomeExpense,
  type IncomeExpense,
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

import type { FormState } from "../interface/incomeExpenseTypes";
import { EMPTY_FORM } from "../interface/incomeExpenseTypes";

export interface IncomeExpenseFormProps {
  incomeExpense?: IncomeExpense;
  mode?: "create" | "edit";
  onSuccess?: () => void;
}

const FORM_ID = "income-expense-form";

export function IncomeExpenseForm({
  incomeExpense,
  mode,
  onSuccess,
}: IncomeExpenseFormProps) {
  const effectiveMode: "create" | "edit" =
    mode ?? (incomeExpense ? "edit" : "create");
  const isEdit = effectiveMode === "edit";

  const router = useRouter();
  const { notify } = useNotification();

  const { values, setFieldValue } = useForm<FormState>(EMPTY_FORM);

  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [categories, setCategories] = useState<IncomeExpenseCategory[]>([]);

  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    getCurrentUser()
      .then((u) => setCurrentUser(u as User))
      .catch(() => setCurrentUser(null));
    getUserAll()
      .then((list) => setUsers(list ?? []))
      .catch(() => setUsers([]));
    getIncomeExpenseCategoryAll()
      .then((list) => setCategories(list ?? []))
      .catch(() => setCategories([]));
  }, []);

  useEffect(() => {
    if (!currentUser) return;
    if (isEdit) return;
    const uid = getRowId(currentUser as any);
    if (values.userId) return;
    setFieldValue("userId", uid);
  }, [currentUser, isEdit, setFieldValue, values.userId]);

  const categoryOptions = useMemo(() => {
    return categories.filter(
      (c) => c.type === values.type && c.status === "Active",
    );
  }, [categories, values.type]);

  useEffect(() => {
    const allowed = new Set(categoryOptions.map((c) => c.id ?? c._id));
    if (values.categoryId && !allowed.has(values.categoryId)) {
      setFieldValue("categoryId", "");
    }
  }, [categoryOptions, setFieldValue, values.categoryId]);

  useEffect(() => {
    if (!incomeExpense) return;
    setFieldValue(
      "type",
      incomeExpense.type === "expense" ? "expense" : "income",
    );
    setFieldValue(
      "categoryId",
      incomeExpense.category_id ||
        (incomeExpense.category as any)?.id ||
        (incomeExpense.category as any)?._id ||
        "",
    );
    setFieldValue("remarks", incomeExpense.remarks || "");
    setFieldValue(
      "amount",
      incomeExpense.amount != null ? String(incomeExpense.amount) : "",
    );
  }, [incomeExpense, setFieldValue]);

  const selectedUser = useMemo(() => {
    if (!values.userId) return null;
    return users.find((u) => getRowId(u as any) === values.userId) ?? null;
  }, [users, values.userId]);

  const userPayload = selectedUser
    ? {
        name: selectedUser.name,
        role: selectedUser.role,
        mobile: selectedUser.mobile,
      }
    : currentUser
      ? {
          name: currentUser.name,
          role: currentUser.role,
          mobile: currentUser.mobile,
        }
      : undefined;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const amountNum = parseFloat(values.amount);
    if (!values.categoryId) {
      const msg = "Category is required";
      setError(msg);
      notify({ type: "error", message: msg });
      return;
    }
    if (values.amount === "" || Number.isNaN(amountNum)) {
      const msg = "Amount is required and must be a number";
      setError(msg);
      notify({ type: "error", message: msg });
      return;
    }

    setSubmitting(true);
    try {
      if (isEdit && incomeExpense) {
        await updateIncomeExpense(getRowId(incomeExpense), {
          type: values.type,
          category_id: values.categoryId,
          remarks: values.remarks.trim(),
          amount: amountNum,
          user: userPayload,
        });
        notify({
          type: "success",
          message: "Income/Expense entry updated successfully.",
        });
      } else {
        await createIncomeExpense({
          type: values.type,
          category_id: values.categoryId,
          remarks: values.remarks.trim(),
          amount: amountNum,
          user: userPayload,
        });
        notify({
          type: "success",
          message: "Income/Expense entry created successfully.",
        });
      }

      onSuccess ? onSuccess() : router.push(routes.incomeExpense.list());
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : isEdit
            ? "Failed to update"
            : "Failed to create entry";
      setError(msg);
      notify({ type: "error", message: msg });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <FormPageLayout
      title={isEdit ? "Edit Income/Expense" : "Add Income/Expense"}
      subtitle={isEdit ? "Update entry" : "Record income or expense."}
      breadcrumbs={[
        { label: "Dashboard", href: routes.dashboard() },
        { label: "Income & Expense", href: routes.incomeExpense.list() },
        { label: isEdit ? "Edit" : "Create" },
      ]}
      backButton={<BackButton fallback={routes.incomeExpense.list()} label="Back to list" />}
      footer={
        <FormFooter
          formId={FORM_ID}
          submitting={submitting}
          submitLabel={isEdit ? "Update" : "Create"}
          submittingLabel={isEdit ? "Updating…" : "Creating…"}
          onCancel={() => router.push(routes.incomeExpense.list())}
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
            label="User"
            value={values.userId}
            onChange={(v) => setFieldValue("userId", v)}
            options={users.map((u) => ({
              value: getRowId(u as any) ?? (u as any)._id ?? "",
              label: u.name ?? (u as any).mobile ?? "—",
            }))}
            placeholder="— Select user —"
          />

          <FormSelectField
            label="Type"
            value={values.type}
            onChange={(v) => setFieldValue("type", v as "income" | "expense")}
            options={[
              { value: "income", label: "Income" },
              { value: "expense", label: "Expense" },
            ]}
            required
          />

          <FormSelectField
            label="Category"
            value={values.categoryId}
            onChange={(v) => setFieldValue("categoryId", v)}
            options={categoryOptions.map((c) => ({
              value: c.id ?? c._id,
              label: c.categoryName,
            }))}
            placeholder="— Select category —"
            required
            helperText={
              categoryOptions.length === 0
                ? "No active categories for this type. Add one in Income & Expense Category."
                : undefined
            }
          />

          <FormTextField
            label="Amount (₹)"
            value={values.amount}
            onChange={(v) => setFieldValue("amount", v)}
            type="number"
            required
            placeholder="0"
          />

          <Box className="fullWidth">
            <FormTextField
              label="Remarks"
              value={values.remarks}
              onChange={(v) => setFieldValue("remarks", v)}
              multiline
              rows={3}
              minRows={2}
              maxRows={6}
            />
          </Box>

      </Box>
    </FormPageLayout>
  );
}

export default IncomeExpenseForm;
