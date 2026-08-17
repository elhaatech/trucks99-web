"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Box from "@mui/material/Box";
import Alert from "@mui/material/Alert";
import type { Material, User } from "@/model/api";
import { createMaterial, getCurrentUser, getRowId, updateMaterial } from "@/model/api";
import {
  BackButton,
  FormFooter,
  FormPageLayout,
  FormTextField,
} from "@/components/common";
import { useForm } from "@/hooks/useForm";
import { useNotification } from "@/hooks/useNotification";
import type { FormState } from "../interface/materialTypes";
import { EMPTY_FORM } from "../interface/materialTypes";
import { routes } from "@/lib/routes";

export interface MaterialFormProps {
  material?: Material;
  mode?: "create" | "edit";
  onSuccess?: () => void;
}

export function MaterialForm({ material, mode, onSuccess }: MaterialFormProps) {
  const effectiveMode: "create" | "edit" = mode ?? (material ? "edit" : "create");
  const isEdit = effectiveMode === "edit";

  const router = useRouter();
  const { notify } = useNotification();

  const { values, setFieldValue } = useForm<FormState>(EMPTY_FORM);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    getCurrentUser()
      .then((u) => setCurrentUser(u as User))
      .catch(() => setCurrentUser(null));
  }, []);

  useEffect(() => {
    if (!material) return;
    setFieldValue("materialsType", material.materials_type || "");
  }, [material, setFieldValue]);

  const handleSubmit = async () => {
    const materialsType = values.materialsType.trim();
    if (!materialsType) {
      const msg = "Material type is required";
      setError(msg);
      notify({ type: "error", message: msg });
      return;
    }

    const userPayload = currentUser ? { name: currentUser.name, role: currentUser.role } : undefined;

    setError("");
    setSubmitting(true);
    try {
      if (isEdit && material) {
        await updateMaterial(getRowId(material), { materials_type: materialsType, user: userPayload });
        notify({ type: "success", message: "Material updated successfully." });
      } else {
        await createMaterial({ materials_type: materialsType, user: userPayload });
        notify({ type: "success", message: "Material created successfully." });
      }
      onSuccess ? onSuccess() : router.push(routes.material.list());
    } catch (err) {
      const msg = err instanceof Error ? err.message : isEdit ? "Failed to update material" : "Failed to create material";
      setError(msg);
      notify({ type: "error", message: msg });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <FormPageLayout
      title={isEdit ? "Edit Material" : "Create Material"}
      subtitle={isEdit ? material?.materials_type : "Add a new material."}
      breadcrumbs={[
        { label: "Dashboard", href: routes.dashboard() },
        { label: "Materials", href: routes.material.list() },
        { label: isEdit ? "Edit" : "Create" },
      ]}
      backButton={<BackButton fallback={routes.material.list()} label="Back to list" />}
      footer={
        <FormFooter
          formId="material-form"
          submitting={submitting}
          submitLabel={isEdit ? "Update" : "Create"}
          submittingLabel={isEdit ? "Updating…" : "Creating…"}
          onCancel={() => router.push(routes.material.list())}
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
        id="material-form"
        onSubmit={(e) => {
          e.preventDefault();
          void handleSubmit();
        }}
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", sm: "repeat(2, minmax(0, 1fr))" },
          gap: 2.5,
          "& > *": { minWidth: 0 },
        }}
      >
        <FormTextField
          label="Material type"
          value={values.materialsType}
          onChange={(v) => setFieldValue("materialsType", v)}
          required
          fullWidth
        />
      </Box>
    </FormPageLayout>
  );
}

