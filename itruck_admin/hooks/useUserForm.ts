"use client";

import { useCallback, useState } from "react";
import { createUser, getRowId, updateUser, type Role, type User } from "@/model/api";
import { useForm } from "@/hooks/useForm";
import { useNotification } from "@/hooks/useNotification";
import { EMPTY_FORM, type FormState, type SetFormFieldFn } from "@/app/admin/portal/user/_components/interface/userTypes";

function normalizeMobileInput(mobile: string): string {
  const trimmed = String(mobile).trim().replace(/\s/g, "");
  if (/^\d{10}$/.test(trimmed)) return `+91${trimmed}`;
  if (trimmed.startsWith("+")) return trimmed;
  return trimmed ? `+91${trimmed}` : "";
}

export function useUserForm(roles: Role[], currentUser: User | null, onSuccess: () => void) {
  const { notify } = useNotification();
  const { values: form, setFieldValue, setValues } = useForm<FormState>(EMPTY_FORM);

  const [editing, setEditing] = useState<User | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  // Use directly so generics match `useForm`’s `setFieldValue` (same approach as load).
  const set: SetFormFieldFn = setFieldValue;

  const openCreate = useCallback(() => {
    setEditing(null);
    setValues({ ...EMPTY_FORM, roleId: "" });
    setDialogOpen(true);
  }, [setValues]);

  const openEdit = useCallback(
    (row: User) => {
      const embeddedRole = row.role as unknown as { _id?: string; id?: string } | undefined;
      const extractedRoleId =
        (row.roleId as unknown as { _id?: string; id?: string } | null | undefined)?._id ??
        (row.roleId as unknown as { _id?: string; id?: string } | null | undefined)?.id ??
        (typeof (row.roleId as unknown) === "string" ? (row.roleId as unknown as string) : "") ??
        embeddedRole?._id ??
        embeddedRole?.id ??
        "";

      setEditing(row);
      setValues({
        ...EMPTY_FORM,
        name: row.name || "",
        mobile: row.mobile || "",
        companyName: (row as any).company_name || "",
        roleId: extractedRoleId,
      });
      setDialogOpen(true);
    },
    [setValues]
  );

  const handleSubmit = useCallback(async () => {
    const name = form.name.trim();
    if (!name) {
      const msg = "Name is required";
      notify({ type: "error", message: msg });
      throw new Error(msg);
    }

    const roleId = form.roleId.trim();
    if (!roleId) {
      const msg = "Role is required";
      notify({ type: "error", message: msg });
      throw new Error(msg);
    }

    const mobileNormalized = normalizeMobileInput(form.mobile);
    if (!mobileNormalized) {
      const msg = "Mobile is required";
      notify({ type: "error", message: msg });
      throw new Error(msg);
    }

    const userPayload = currentUser ? { name: currentUser.name, role: currentUser.role } : undefined;

    if (editing) {
      await updateUser(getRowId(editing), {
        name,
        roleId,
        mobile: mobileNormalized,
        user: userPayload,
      });
      notify({ type: "success", message: "User updated successfully" });
    } else {
      await createUser({
        name,
        roleId,
        mobile: mobileNormalized,
        company_name: form.companyName.trim() || undefined,
        termsAccepted: true,
      });
      notify({ type: "success", message: "User created successfully" });
    }

    setDialogOpen(false);
    onSuccess();
  }, [form, editing, currentUser, onSuccess, notify]);

  return {
    form,
    set,
    editing,
    dialogOpen,
    setDialogOpen,
    openCreate,
    openEdit,
    handleSubmit,
  };
}

