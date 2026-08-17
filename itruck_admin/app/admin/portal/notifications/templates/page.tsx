"use client";

import { useCallback, useEffect, useState } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Switch from "@mui/material/Switch";
import FormControlLabel from "@mui/material/FormControlLabel";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import Alert from "@mui/material/Alert";
import Stack from "@mui/material/Stack";
import { ModulePageLayout } from "@/components/common";
import { Skeleton } from "@/components/ui/Skeleton";
import { routes } from "@/lib/routes";
import {
  getNotificationTemplates,
  updateNotificationTemplate,
  type NotificationTemplate,
} from "@/model/api";

export default function NotificationTemplatesPage() {
  const [templates, setTemplates] = useState<NotificationTemplate[]>([]);
  const [selected, setSelected] = useState<NotificationTemplate | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const load = useCallback(() => {
    setLoading(true);
    setError("");
    getNotificationTemplates()
      .then((data) => {
        setTemplates(data ?? []);
        if (!selected && data?.length) setSelected(data[0]);
      })
      .catch((err) =>
        setError(err instanceof Error ? err.message : "Failed to load templates"),
      )
      .finally(() => setLoading(false));
  }, [selected]);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSave = async () => {
    if (!selected) return;
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const updated = await updateNotificationTemplate(selected.event, {
        label: selected.label,
        description: selected.description,
        enabled: selected.enabled,
        channels: selected.channels,
        templates: selected.templates,
        placeholders: selected.placeholders,
      });
      setSelected(updated);
      setTemplates((prev) =>
        prev.map((t) => (t.event === updated.event ? updated : t)),
      );
      setSuccess("Template saved.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const updateField = (path: string, value: string | boolean) => {
    if (!selected) return;
    const next = structuredClone(selected);
    const parts = path.split(".");
    let cur: Record<string, unknown> = next as unknown as Record<string, unknown>;
    for (let i = 0; i < parts.length - 1; i += 1) {
      const key = parts[i];
      if (!cur[key] || typeof cur[key] !== "object") cur[key] = {};
      cur = cur[key] as Record<string, unknown>;
    }
    cur[parts[parts.length - 1]] = value;
    setSelected(next);
  };

  return (
    <ModulePageLayout
      title="Notification Templates"
      subtitle="Configure WhatsApp, SMS, email, push, and in-app message templates."
      breadcrumbs={[
        { label: "Dashboard", href: routes.dashboard() },
        { label: "Notifications", href: routes.notifications() },
        { label: "Templates" },
      ]}
      error={error}
      onErrorClose={() => setError("")}
      action={
        selected ? (
          <Button variant="contained" onClick={handleSave} disabled={saving}>
            {saving ? "Saving…" : "Save template"}
          </Button>
        ) : undefined
      }
    >
      {success ? (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess("")}>
          {success}
        </Alert>
      ) : null}

      {loading ? (
        <Skeleton variant="rectangular" height={400} />
      ) : (
        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "280px 1fr" }, gap: 3 }}>
          <Box
            sx={{
              border: "1px solid",
              borderColor: "divider",
              borderRadius: 2,
              overflow: "hidden",
            }}
          >
            {templates.map((t) => (
              <Box
                key={t.event}
                onClick={() => setSelected(t)}
                sx={{
                  px: 2,
                  py: 1.5,
                  cursor: "pointer",
                  bgcolor: selected?.event === t.event ? "action.selected" : "transparent",
                  borderBottom: "1px solid",
                  borderColor: "divider",
                  "&:hover": { bgcolor: "action.hover" },
                }}
              >
                <Typography variant="subtitle2">{t.label}</Typography>
                <Typography variant="caption" color="text.secondary">
                  {t.event}
                </Typography>
              </Box>
            ))}
          </Box>

          {selected ? (
            <Stack spacing={2}>
              <FormControlLabel
                control={
                  <Switch
                    checked={selected.enabled !== false}
                    onChange={(e) => updateField("enabled", e.target.checked)}
                  />
                }
                label="Template enabled"
              />

              <Typography variant="subtitle2">Channels</Typography>
              <Stack direction="row" flexWrap="wrap" gap={1}>
                {(["in_app", "whatsapp", "sms", "email", "push"] as const).map((ch) => (
                  <FormControlLabel
                    key={ch}
                    control={
                      <Switch
                        size="small"
                        checked={selected.channels?.[ch] !== false}
                        onChange={(e) => updateField(`channels.${ch}`, e.target.checked)}
                      />
                    }
                    label={ch}
                  />
                ))}
              </Stack>

              {selected.placeholders?.length ? (
                <Typography variant="caption" color="text.secondary">
                  Placeholders: {selected.placeholders.map((p) => `{{${p}}}`).join(", ")}
                </Typography>
              ) : null}

              <TextField
                label="In-app title"
                fullWidth
                value={selected.templates?.in_app?.title ?? ""}
                onChange={(e) => updateField("templates.in_app.title", e.target.value)}
              />
              <TextField
                label="In-app body"
                fullWidth
                multiline
                minRows={2}
                value={selected.templates?.in_app?.body ?? ""}
                onChange={(e) => updateField("templates.in_app.body", e.target.value)}
              />
              <TextField
                label="WhatsApp body"
                fullWidth
                multiline
                minRows={2}
                value={selected.templates?.whatsapp?.body ?? ""}
                onChange={(e) => updateField("templates.whatsapp.body", e.target.value)}
              />
              <TextField
                label="SMS body"
                fullWidth
                multiline
                minRows={2}
                value={selected.templates?.sms?.body ?? ""}
                onChange={(e) => updateField("templates.sms.body", e.target.value)}
              />
              <TextField
                label="Email subject"
                fullWidth
                value={selected.templates?.email?.subject ?? ""}
                onChange={(e) => updateField("templates.email.subject", e.target.value)}
              />
              <TextField
                label="Email body"
                fullWidth
                multiline
                minRows={3}
                value={selected.templates?.email?.body ?? ""}
                onChange={(e) => updateField("templates.email.body", e.target.value)}
              />
              <TextField
                label="Push title"
                fullWidth
                value={selected.templates?.push?.title ?? ""}
                onChange={(e) => updateField("templates.push.title", e.target.value)}
              />
              <TextField
                label="Push body"
                fullWidth
                value={selected.templates?.push?.body ?? ""}
                onChange={(e) => updateField("templates.push.body", e.target.value)}
              />
            </Stack>
          ) : (
            <Typography color="text.secondary">Select a template to edit.</Typography>
          )}
        </Box>
      )}
    </ModulePageLayout>
  );
}
