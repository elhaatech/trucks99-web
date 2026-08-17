"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import { useRouter, useParams } from "next/navigation";
import { DataTable, ConfirmDialog, ModulePageLayout, createdAtColumn, type DataTableAction } from "@/components/common";
import { DeleteIcon, EditIcon, ViewIcon } from "@/components/ui/Icons";
import {
  deleteSpecificationValue,
  getRowId,
  getSpecificationValues,
  getSpecifications,
  updateSpecificationValue,
  bulkUploadSpecificationValues,
  type ActiveInactive,
  type Specification,
  type SpecificationValue,
  type BulkUploadResult,
} from "@/model/api";
import { useNotification } from "@/hooks/useNotification";
import { routes } from "@/lib/routes";
import { renderClickableName } from "@/components/common/table/tableColumnHelpers";

export function SpecificationValuesPage() {
  const router = useRouter();
  const params = useParams();

  // 👇 This is the specification's ID from the URL path
  const specificationId = params?.id as string | undefined;

  const { notify } = useNotification();
  const [rows, setRows] = useState<SpecificationValue[]>([]);
  const [specifications, setSpecifications] = useState<Specification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  // 👇 Pre-fill dropdown from URL id
  const [selectedSpecId, setSelectedSpecId] = useState<string>(specificationId ?? "");

  const [deleteTarget, setDeleteTarget] = useState<SpecificationValue | null>(null);

  // ── Bulk upload state ────────────────────────────────────────────────────
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [bulkUploading, setBulkUploading] = useState(false);
  const [bulkResult, setBulkResult] = useState<BulkUploadResult | null>(null);
  const [bulkDialogOpen, setBulkDialogOpen] = useState(false);

  // 👇 Load all specifications for the dropdown list
  const loadSpecifications = useCallback(async () => {
    try {
      const data = await getSpecifications({});
      setSpecifications(data);
    } catch (e) {
      notify({ type: "error", message: "Failed to load specifications for dropdown." });
    }
  }, [notify]);

  useEffect(() => {
    void loadSpecifications();
  }, [loadSpecifications]);

  // 👇 Sync selectedSpecId when URL param changes
  useEffect(() => {
    if (specificationId) {
      setSelectedSpecId(specificationId);
    }
  }, [specificationId]);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      // 👇 Filter by specification_id (the parent ID), not specification_value_id
      const data = await getSpecificationValues({
        search,
        status: statusFilter,
        ...(selectedSpecId ? { specification_id: selectedSpecId } : {}),
      });
      setRows(data);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to load specification values";
      setError(msg);
      notify({ type: "error", message: msg });
    } finally {
      setLoading(false);
    }
  }, [notify, search, statusFilter, selectedSpecId]);

  useEffect(() => {
    void load();
  }, [load]);

  const onToggleStatus = async (row: SpecificationValue) => {
    const nextStatus: ActiveInactive = row.status === "Active" ? "Inactive" : "Active";
    try {
      await updateSpecificationValue(getRowId(row), {
        specification_id: row.specification_id,
        specification_value_name: row.specification_value_name,
        status: nextStatus,
        subcategory_id: row.subcategory_id,
      });
      notify({ type: "success", message: "Specification value status updated." });
      await load();
    } catch (e) {
      notify({ type: "error", message: e instanceof Error ? e.message : "Status update failed" });
    }
  };

  const onDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteSpecificationValue(getRowId(deleteTarget));
      setDeleteTarget(null);
      notify({ type: "success", message: "Specification value deleted." });
      await load();
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
      const result = await bulkUploadSpecificationValues(file);
      setBulkResult(result);
      setBulkDialogOpen(true);
      notify({
        type: "success",
        message: `Bulk upload complete: ${result.inserted ?? 0} added, ${result.skipped ?? 0} skipped.`,
      });
      await load();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Bulk upload failed";
      notify({ type: "error", message: msg });
    } finally {
      setBulkUploading(false);
    }
  };

  const columns = useMemo(
    () => [
      {
        id: "specification_name",
        label: "Specification Name",
        sortable: true,
        render: (row: SpecificationValue) =>
          row.specification?.specification_name || "—",
      },

      {
        id: "specification_value_name",
        label: "Value Name",
        sortable: true,
        render: (row: SpecificationValue) =>
          renderClickableName(
            row.specification_value_name || "",
            routes.specificationValue.view(getRowId(row))
          ),
      },

      {
        id: "status",
        label: "Status",
        sortable: true,
        render: (row: SpecificationValue) => (
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
      createdAtColumn<SpecificationValue>(),
    ],
    []
  );
  const actions = (row: SpecificationValue): DataTableAction<SpecificationValue>[] => [
    {
      label: "Edit",
      icon: <EditIcon />,
      onClick: () => router.push(routes.specificationValue.edit(getRowId(row))),
    },

    {
      label: "Delete",
      icon: <DeleteIcon />,
      onClick: () => setDeleteTarget(row),
      color: "error",
    },
  ];

  // 👇 Find the selected spec name to show in subtitle and dropdown
  const selectedSpecName = specifications.find(
    (s) => getRowId(s) === selectedSpecId
  )?.specification_name;

  const breadcrumbs = specificationId
    ? [
        { label: "Dashboard", href: routes.dashboard() },
        { label: "Specifications", href: routes.specification.list() },
        { label: selectedSpecName || "Specification Values" },
      ]
    : [
        { label: "Dashboard", href: routes.dashboard() },
        { label: "Specifications", href: routes.specification.list() },
        { label: "Specification Values" },
      ];

  return (
    <ModulePageLayout
      title="Specification Values"
      subtitle={
        selectedSpecName
          ? `Showing values for: ${selectedSpecName}`
          : "Browse and manage all specification values."
      }
      breadcrumbs={breadcrumbs}
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
            onClick={() =>
              selectedSpecId
                ? router.push(`/admin/portal/specification-values/create/${selectedSpecId}`)
                : router.push(routes.specificationValue.create())
            }
          >
            Add Specification Value
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

        {/* 👇 Specification Name dropdown — pre-selected from URL path id */}
        <FormControl size="small" sx={{ minWidth: 220 }}>
          <InputLabel>Specification Name</InputLabel>
          <Select
            label="Specification Name"
            value={selectedSpecId}
            onChange={(e) => {
              const newId = String(e.target.value);
              setSelectedSpecId(newId);
              // 👇 Update URL when dropdown changes so page stays in sync
              if (newId) {
                router.push(`/admin/portal/specification-values/list/${newId}`);
              } else {
                router.push(`/admin/portal/specification-values/list`);
              }
            }}
          >
            <MenuItem value="">All</MenuItem>
            {/* 👇 Only show selectable type specifications in dropdown */}
            {specifications
              .filter((spec) => spec.type === "selectable")
              .map((spec) => (
                <MenuItem key={getRowId(spec)} value={getRowId(spec)}>
                  {spec.specification_name}
                </MenuItem>
              ))}
          </Select>
        </FormControl>

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
        columns={columns}
        rows={rows}
        getRowId={getRowId}
        loading={loading}
        actions={actions}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={onDelete}
        title="Delete specification value?"
        description={`This will permanently delete "${deleteTarget?.specification_value_name || ""}".`}
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