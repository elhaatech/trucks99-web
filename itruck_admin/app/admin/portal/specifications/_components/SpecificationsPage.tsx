"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  InputLabel,
  List,
  ListItem,
  ListItemText,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import UploadFileIcon from "@mui/icons-material/UploadFile";

import type { DataTableAction } from "@/components/common";
import { ConfirmDialog, DataTable, ModulePageLayout, createdAtColumn } from "@/components/common";
import { DeleteIcon, EditIcon, ViewIcon } from "@/components/ui/Icons";
import { routes } from "@/lib/routes";
import { useNotification } from "@/hooks/useNotification";
import { deleteSpecification, getRowId, getSpecifications, updateSpecification, bulkUploadSpecifications, type ActiveInactive, type Specification, type BulkUploadResult } from "@/model/api";
import { renderClickableName } from "@/components/common/table/tableColumnHelpers";

export function SpecificationsPage() {
  const router = useRouter();
  const { notify } = useNotification();
  const [rows, setRows] = useState<Specification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [deleteSpec, setDeleteSpec] = useState<Specification | null>(null);

  // ── Bulk upload state ────────────────────────────────────────────────────
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [bulkUploading, setBulkUploading] = useState(false);
  const [bulkResult, setBulkResult] = useState<BulkUploadResult | null>(null);
  const [bulkDialogOpen, setBulkDialogOpen] = useState(false);

  const loadSpecifications = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await getSpecifications({ search, status: statusFilter });
      setRows(data);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to load specifications";
      setError(msg);
      notify({ type: "error", message: msg });
    } finally {
      setLoading(false);
    }
  }, [notify, search, statusFilter]);

  useEffect(() => {
    void loadSpecifications();
  }, [loadSpecifications]);

  const onConfirmDeleteSpecification = async () => {
    if (!deleteSpec) return;
    try {
      await deleteSpecification(getRowId(deleteSpec));
      setDeleteSpec(null);
      notify({ type: "success", message: "Specification deleted successfully." });
      await loadSpecifications();
    } catch (e) {
      notify({ type: "error", message: e instanceof Error ? e.message : "Delete failed" });
    }
  };

  const onBulkUploadClick = () => {
    fileInputRef.current?.click();
  };

  const onBulkFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    // reset so selecting the same file again still fires onChange
    e.target.value = "";
    if (!file) return;

    setBulkUploading(true);
    setBulkResult(null);
    try {
      const result = await bulkUploadSpecifications(file);
      setBulkResult(result);
      setBulkDialogOpen(true);
      notify({
        type: "success",
        message: `Bulk upload complete: ${result.inserted ?? 0} added, ${result.skipped ?? 0} skipped.`,
      });
      await loadSpecifications();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Bulk upload failed";
      notify({ type: "error", message: msg });
    } finally {
      setBulkUploading(false);
    }
  };

  const specificationColumns = useMemo(
  () => [
    {
      id: "specification_name",
      label: "Name",
      sortable: true,
      render: (row: Specification) =>
        renderClickableName(
          row.specification_name || "",
          `/admin/portal/specifications/view/${getRowId(row)}`
        ),
    },

    {
      id: "type",
      label: "Type",
      sortable: true,
      render: (row: Specification) => (
        <Chip
          size="small"
          label={row.type}
          color={
            row.type === "selectable"
              ? "primary"
              : "default"
          }
        />
      ),
    },

    {
      id: "is_required",
      label: "Required",
      sortable: true,
      render: (row: Specification) =>
        row.is_required,
    },

    {
      id: "status",
      label: "Status",
      sortable: true,
      render: (row: Specification) => (
        <Chip
          size="small"
          label={row.status}
          color={
            row.status === "Active"
              ? "success"
              : "default"
          }
          variant="outlined"
        />
      ),
    },

    {
      id: "manage_values",
      label: "Manage Column Values",
      sortable: false,
      render: (row: Specification) =>
        renderClickableName(
          "Manage Column Values",
          `/admin/portal/specification-values/list/${getRowId(row)}`
        ),
    },
    createdAtColumn<Specification>({
      id: "created_date",
      getValue: (row) => row.created_date,
    }),
  ],
  []
);

  const specActions = (row: Specification): DataTableAction<Specification>[] => {
    const actions: DataTableAction<Specification>[] = [
      {
        label: "Edit",
        icon: <EditIcon />,
        onClick: () => router.push(routes.specification.edit(getRowId(row))),
      },
      {
        label: "Delete",
        icon: <DeleteIcon />,
        onClick: () => setDeleteSpec(row),
        color: "error",
      },
    ];

    return actions;
  };

  return (
    <ModulePageLayout
      title="Specifications"
      subtitle="Manage specifications and specification values."
      breadcrumbs={[
        { label: "Dashboard", href: routes.dashboard() },
        { label: "Specifications" },
      ]}
      error={error}
      onErrorClose={() => setError("")}
      action={
        <Stack direction="row" spacing={1}>
          <Button
            variant="outlined"
            startIcon={bulkUploading ? <CircularProgress size={16} /> : <UploadFileIcon />}
            onClick={onBulkUploadClick}
            disabled={bulkUploading}
          >
            {bulkUploading ? "Uploading..." : "Bulk Upload"}
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls,.csv"
            hidden
            onChange={onBulkFileSelected}
          />
          <Button
            variant="contained"
            onClick={() => router.push(routes.specification.create())}
          >
            Add Specification
          </Button>
        </Stack>
      }
    >
      <Stack direction={{ xs: "column", md: "row" }} spacing={2} sx={{ mb: 2 }}>
        <TextField
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          label="Search"
          size="small"
        />
        <FormControl size="small" sx={{ minWidth: 180 }}>
          <InputLabel>Status</InputLabel>
          <Select
            label="Status"
            value={statusFilter}
            onChange={(e) => setStatusFilter(String(e.target.value))}
          >
            <MenuItem value="">All</MenuItem>
            <MenuItem value="Active">Active</MenuItem>
            <MenuItem value="Inactive">Inactive</MenuItem>
          </Select>
        </FormControl>
        <Button variant="outlined" onClick={() => setSearch(searchInput.trim())}>
          Search
        </Button>
      </Stack>

      <DataTable
        columns={specificationColumns}
        rows={rows}
        getRowId={getRowId}
        loading={loading}
        actions={specActions}
      />

      <ConfirmDialog
        open={!!deleteSpec}
        onClose={() => setDeleteSpec(null)}
        onConfirm={onConfirmDeleteSpecification}
        title="Delete specification?"
        description={`This will permanently delete "${deleteSpec?.specification_name || ""}".`}
        confirmLabel="Delete"
        confirmColor="error"
      />

      {/* ── Bulk upload result dialog ───────────────────────────────────── */}
      <Dialog open={bulkDialogOpen} onClose={() => setBulkDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Bulk Upload Results</DialogTitle>
        <DialogContent dividers>
          {bulkResult ? (
            <Stack spacing={1}>
              <Typography variant="body2">
                Total rows: <b>{bulkResult.total ?? 0}</b>
              </Typography>
              <Typography variant="body2" color="success.main">
                Inserted: <b>{bulkResult.inserted ?? 0}</b>
              </Typography>
              <Typography variant="body2" color={bulkResult.skipped ? "error.main" : "text.secondary"}>
                Skipped: <b>{bulkResult.skipped ?? 0}</b>
              </Typography>

              {!!bulkResult.errors?.length && (
                <>
                  <Typography variant="subtitle2" sx={{ mt: 1 }}>
                    Errors
                  </Typography>
                  <List dense sx={{ maxHeight: 240, overflowY: "auto" }}>
                    {bulkResult.errors.map((e, idx) => (
                      <ListItem key={idx} disableGutters>
                        <ListItemText primary={`Row ${e.row}`} secondary={e.message} />
                      </ListItem>
                    ))}
                  </List>
                </>
              )}
            </Stack>
          ) : (
            <Typography variant="body2">No result.</Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setBulkDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </ModulePageLayout>
  );
}