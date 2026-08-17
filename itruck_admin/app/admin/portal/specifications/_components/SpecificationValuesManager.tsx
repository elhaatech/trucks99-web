"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Alert, Box, Button, Chip, FormControl, InputLabel, MenuItem, Select, Stack, TextField } from "@mui/material";
import { ConfirmDialog, DataTable, createdAtColumn, type DataTableAction } from "@/components/common";
import { useNotification } from "@/hooks/useNotification";
import {
  createSpecificationValue,
  deleteSpecificationValue,
  getRowId,
  getSpecificationValues,
  updateSpecificationValue,
  type ActiveInactive,
  type Specification,
  type SpecificationValue,
} from "@/model/api";
import { DeleteIcon, EditIcon } from "@/components/ui/Icons";

export function SpecificationValuesManager({ specification }: { specification: Specification }) {
  const { notify } = useNotification();
  const [rows, setRows] = useState<SpecificationValue[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [form, setForm] = useState({ specification_value_name: "", status: "Active" as ActiveInactive });
  const [editing, setEditing] = useState<SpecificationValue | null>(null);
  const [deleting, setDeleting] = useState<SpecificationValue | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getSpecificationValues({ specification_id: getRowId(specification) });
      setRows(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load values");
    } finally {
      setLoading(false);
    }
  }, [specification]);

  useEffect(() => {
    void load();
  }, [load]);

  const onSubmit = async () => {
    if (!form.specification_value_name.trim()) return;
    try {
if (editing) {
  await updateSpecificationValue(getRowId(editing), {
    specification_id: getRowId(specification),
    subcategory_id: editing.subcategory_id,
    specification_value_name: form.specification_value_name.trim(),
    status: form.status,
  });
  notify({ type: "success", message: "Specification value updated." });
} else {
        await createSpecificationValue({
          specification_id: getRowId(specification),
          subcategory_id: specification.subcategory_id,
          specification_value_name: form.specification_value_name.trim(),
          // status: form.status,
        });
        notify({ type: "success", message: "Specification value created." });
      }
      setEditing(null);
      setForm({ specification_value_name: "", status: "Active" });
      await load();
    } catch (e) {
      notify({ type: "error", message: e instanceof Error ? e.message : "Save failed" });
    }
  };

  const onDelete = async () => {
    if (!deleting) return;
    try {
      await deleteSpecificationValue(getRowId(deleting));
      setDeleting(null);
      notify({ type: "success", message: "Specification value deleted." });
      await load();
    } catch (e) {
      notify({ type: "error", message: e instanceof Error ? e.message : "Delete failed" });
    }
  };

  const columns = useMemo(
    () => [
      { id: "specification_value_name", label: "Value Name", render: (row: SpecificationValue) => row.specification_value_name },
      {
        id: "status",
        label: "Status",
        render: (row: SpecificationValue) => (
          <Chip label={row.status} size="small" color={row.status === "Active" ? "success" : "default"} variant="outlined" />
        ),
      },
      createdAtColumn<SpecificationValue>(),
    ],
    []
  );

  const actions = (row: SpecificationValue): DataTableAction<SpecificationValue>[] => [
    {
      label: "Edit",
      icon: <EditIcon />,
      onClick: () => {
        setEditing(row);
        setForm({ specification_value_name: row.specification_value_name, status: row.status });
      },
    },
    { label: "Delete", icon: <DeleteIcon />, onClick: () => setDeleting(row), color: "error" },
  ];

  return (
    <Box>
      <Stack direction={{ xs: "column", md: "row" }} spacing={2} sx={{ mb: 2 }}>
        <TextField
          size="small"
          label="Value Name"
          value={form.specification_value_name}
          onChange={(e) => setForm((f) => ({ ...f, specification_value_name: e.target.value }))}
          fullWidth
        />
        <FormControl size="small" sx={{ minWidth: 160 }}>
          <InputLabel>Status</InputLabel>
          <Select
            label="Status"
            value={form.status}
            onChange={(e) => setForm((f) => ({ ...f, status: (e.target.value as ActiveInactive) || "Active" }))}
          >
            <MenuItem value="Active">Active</MenuItem>
            <MenuItem value="Inactive">Inactive</MenuItem>
          </Select>
        </FormControl>
        <Button variant="contained" onClick={() => void onSubmit()}>
          {editing ? "Update Value" : "Add Value"}
        </Button>
      </Stack>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError("")}>
          {error}
        </Alert>
      )}

      <DataTable columns={columns} rows={rows} getRowId={getRowId} loading={loading} actions={actions} />

      <ConfirmDialog
        open={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={onDelete}
        title="Delete specification value?"
        description={`This will permanently delete "${deleting?.specification_value_name || ""}".`}
        confirmLabel="Delete"
        confirmColor="error"
      />
    </Box>
  );
}
