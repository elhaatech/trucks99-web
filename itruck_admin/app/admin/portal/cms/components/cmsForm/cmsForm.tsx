"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Alert from "@mui/material/Alert";
import Typography from "@mui/material/Typography";

import { PageHeader } from "@/components/ui";
import { routes } from "@/lib/routes";
import { FormFooter, FormTextField } from "@/components/common";
import { useForm } from "@/hooks/useForm";
import { useNotification } from "@/hooks/useNotification";
import { CMSPage, createCMSPage, EMPTY_FORM, FormState, updateCMSPage } from "@/model/services/cms";


export interface CMSFormProps {
  cmsPage?: CMSPage;
  mode?: "create" | "edit";
  onSuccess?: () => void;
}

const FORM_ID = "cms-page-form";

export function CMSForm({ cmsPage, mode, onSuccess }: CMSFormProps) {
  const effectiveMode: "create" | "edit" =
    mode ?? (cmsPage ? "edit" : "create");
  const isEdit = effectiveMode === "edit";

  const router = useRouter();
  const { notify } = useNotification();

  const { values, setFieldValue } = useForm<FormState>(EMPTY_FORM);

  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!cmsPage) return;
    setFieldValue("page_title", cmsPage.page_title || "");
    setFieldValue("page_description", cmsPage.page_description || "");
  }, [cmsPage, setFieldValue]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!values.page_title.trim()) {
      const msg = "Page title is required";
      setError(msg);
      notify({ type: "error", message: msg });
      return;
    }
    if (!values.page_description.trim()) {
      const msg = "Page description is required";
      setError(msg);
      notify({ type: "error", message: msg });
      return;
    }

    setSubmitting(true);
    try {
      if (isEdit && cmsPage) {
        await updateCMSPage(cmsPage.id || cmsPage._id, {
          page_title: values.page_title.trim(),
          page_description: values.page_description.trim(),
        });
        notify({ type: "success", message: "CMS page updated successfully." });
      } else {
        await createCMSPage({
          page_title: values.page_title.trim(),
          page_description: values.page_description.trim(),
        });
        notify({ type: "success", message: "CMS page created successfully." });
      }

      onSuccess ? onSuccess() : router.push(routes.cms.list());
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : isEdit
            ? "Failed to update"
            : "Failed to create page";
      setError(msg);
      notify({ type: "error", message: msg });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Box>
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
          title={isEdit ? "Edit CMS Page" : "Add CMS Page"}
          subtitle={
            isEdit ? "Update page content" : "Create a new static content page."
          }
          action={
            <Button
              variant="outlined"
              onClick={() => router.push(routes.cms.list())}
            >
              Back to list
            </Button>
          }
        />

        {error && (
          <Alert severity="error" onClose={() => setError("")} sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {isEdit && cmsPage?.slug && (
          <Typography
            variant="caption"
            sx={{
              display: "block",
              mb: 2,
              fontFamily: "monospace",
              color: "text.secondary",
            }}
          >
            Slug: {cmsPage.slug} (auto-generated from title, updates if title
            changes)
          </Typography>
        )}

        <Box
          component="form"
          id={FORM_ID}
          onSubmit={handleSubmit}
          sx={{
            display: "grid",
            gridTemplateColumns: "1fr",
            gap: 2,
          }}
        >
          <FormTextField
            label="Page Title"
            value={values.page_title}
            onChange={(v) => setFieldValue("page_title", v)}
            required
            placeholder="e.g. About Us"
          />

          <FormTextField
            label="Page Description"
            value={values.page_description}
            onChange={(v) => setFieldValue("page_description", v)}
            multiline
            rows={10}
            minRows={8}
            maxRows={20}
            required
            placeholder="Page content (HTML supported)"
          />

          <FormFooter
            formId={FORM_ID}
            submitting={submitting}
            submitLabel={isEdit ? "Update" : "Create"}
            submittingLabel={isEdit ? "Updating…" : "Creating…"}
            onCancel={() => router.push(routes.cms.list())}
          />
        </Box>
      </Box>
    </Box>
  );
}

export default CMSForm;