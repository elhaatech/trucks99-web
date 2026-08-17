"use client";

import Box from "@mui/material/Box";
import type { Role, User } from "@/model/api";
import { FormDialog, ModalSection } from "@/components/ui";
import { FormSelectField, FormTextField, type SelectOption } from "@/components/common";
import type { FormState, SetFormFieldFn } from "../interface/userTypes";

export interface UserFormDialogProps {
  open: boolean;
  onClose: () => void;
  editing: User | null;
  form: FormState;
  set: SetFormFieldFn;
  onSubmit: () => Promise<void>;
  roles: Role[];
}

function isSuperAdminRole(role: Role): boolean {
  const name = (role.name || "").trim().toLowerCase();
  return name === "super admin" || name === "superadmin";
}

export function UserFormDialog({ open, onClose, editing, form, set, onSubmit, roles }: UserFormDialogProps) {
  const roleOptions: SelectOption[] = roles
    .filter((r) => !isSuperAdminRole(r))
    .map((r) => ({ value: r._id ?? r.id ?? "", label: r.name ?? "" }))
    .filter((o) => Boolean(o.value));

  return (
    <FormDialog
      open={open}
      onClose={onClose}
      title={editing ? "Edit User" : "Add User"}
      description={editing ? "Update user account details and role." : "Create a new user and assign a role."}
      submitLabel={editing ? "Update" : "Create"}
      onSubmit={onSubmit}
      maxWidth="sm"
    >
      <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
        <ModalSection title="Basic information" subtitle="Core account details used for login and contacts.">
          <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 2 }}>
            <FormTextField
              label="Name"
              value={form.name}
              onChange={(v) => set("name", v)}
              placeholder="Enter full name"
              required
            />
            <FormTextField
              label="Mobile"
              value={form.mobile}
              onChange={(v) => set("mobile", v)}
              placeholder="9876543210 or +919876543210"
              required
            />
            <FormTextField
              label="Company name"
              value={form.companyName}
              onChange={(v) => set("companyName", v)}
              placeholder="Optional"
            />
          </Box>
        </ModalSection>
        <ModalSection title="Access control" subtitle="Role decides module and action permissions for this user.">
          <FormSelectField
            label="Role"
            value={form.roleId}
            onChange={(v) => set("roleId", v)}
            options={roleOptions}
            placeholder="— Select role —"
            required
          />
        </ModalSection>
      </Box>
    </FormDialog>
  );
}

