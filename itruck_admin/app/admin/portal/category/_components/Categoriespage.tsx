"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import {
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  Typography,
} from "@mui/material";

import type { DataTableAction } from "@/components/common";
import {
  ConfirmDialog,
  DataTable,
  ModulePageLayout,
  createdAtColumn,
} from "@/components/common";
import { DeleteIcon, EditIcon, ViewIcon } from "@/components/ui/Icons";
import { routes } from "@/lib/routes";
import { useNotification } from "@/hooks/useNotification";
import {
  type Category,
  deleteCategory,
  getCategories,
  getCategoryRowId,
  bulkUploadCategories,
  type BulkUploadResult,
} from "@/model/services/category";
import { renderClickableName } from "@/components/common/table/tableColumnHelpers";

export function CategoriesPage() {
  const router = useRouter();
  const { notify } = useNotification();
  const [rows, setRows] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [deleteCat, setDeleteCat] = useState<Category | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [bulkUploading, setBulkUploading] = useState(false);
  const [bulkResult, setBulkResult] = useState<BulkUploadResult | null>(null);
  const [bulkDialogOpen, setBulkDialogOpen] = useState(false);

  const loadCategories = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await getCategories();
      setRows(data);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to load categories";
      setError(msg);
      notify({ type: "error", message: msg });
    } finally {
      setLoading(false);
    }
  }, [notify]);

  useEffect(() => {
    void loadCategories();
  }, [loadCategories]);

  const onConfirmDeleteCategory = async () => {
    if (!deleteCat) return;
    try {
      await deleteCategory([getCategoryRowId(deleteCat)]);
      setDeleteCat(null);
      notify({ type: "success", message: "Category deleted successfully." });
      await loadCategories();
    } catch (e) {
      notify({
        type: "error",
        message: e instanceof Error ? e.message : "Delete failed",
      });
    }
  };

  const onBulkUploadClick = () => {
    fileInputRef.current?.click();
  };

  const onBulkFileSelected = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    setBulkUploading(true);
    setBulkResult(null);

    try {
      const result = await bulkUploadCategories(file);
      setBulkResult(result);
      setBulkDialogOpen(true);
      notify({
        type: "success",
        message: `Bulk upload complete: ${result.inserted ?? 0} added, ${result.skipped ?? 0} skipped.`,
      });
      await loadCategories();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Bulk upload failed";
      notify({ type: "error", message: msg });
    } finally {
      setBulkUploading(false);
    }
  };

  const categoryColumns = useMemo(
    () => [
      {
        id: "category_name",
        label: "Name",
        render: (row: Category) =>
          renderClickableName(
            row.category_name || "",
            routes.subCategory.list(getCategoryRowId(row)),
          ),
      },
      {
        id: "status",
        label: "Status",
        sortable: true,
        render: (row: Category) => (
          <Chip
            size="small"
            label={row.status}
            color={
              row.status?.toLowerCase() === "active" ? "success" : "default"
            }
            variant="outlined"
          />
        ),
      },
      {
        id: "created_by",
        sortable: true,
        label: "Created By",
        render: (row: Category) => row.created_by ?? "-",
      },
      createdAtColumn<Category>(),
    ],
    [],
  );

  const catActions = (row: Category): DataTableAction<Category>[] => {
    const actions: DataTableAction<Category>[] = [
      {
        label: "View",
        icon: <ViewIcon />,
        onClick: () => router.push(routes.category.view(getCategoryRowId(row))),
      },
      {
        label: "Edit",
        icon: <EditIcon />,
        onClick: () => router.push(routes.category.edit(getCategoryRowId(row))),
      },
      {
        label: "Delete",
        icon: <DeleteIcon />,
        onClick: () => setDeleteCat(row),
        color: "error",
      },
    ];
    return actions;
  };

  return (
    <ModulePageLayout
      title="Categories"
      subtitle="Manage product categories."
      breadcrumbs={[
        { label: "Dashboard", href: routes.dashboard() },
        { label: "Categories" },
      ]}
      error={error}
      onErrorClose={() => setError("")}
      action={
        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
          <Button
            variant="outlined"
            startIcon={bulkUploading ? <CircularProgress size={16} /> : undefined}
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
            onClick={() => router.push(routes.category.create())}
          >
            Add Category
          </Button>
        </Stack>
      }
    >
      <DataTable
        columns={categoryColumns}
        rows={rows}
        getRowId={getCategoryRowId}
        loading={loading}
        actions={catActions}
      />

      <ConfirmDialog
        open={!!deleteCat}
        onClose={() => setDeleteCat(null)}
        onConfirm={onConfirmDeleteCategory}
        title="Delete category?"
        description={`This will permanently delete "${deleteCat?.category_name || ""}".`}
        confirmLabel="Delete"
        confirmColor="error"
      />

      <Dialog open={bulkDialogOpen} onClose={() => setBulkDialogOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Bulk Upload Result</DialogTitle>
        <DialogContent>
          <Typography sx={{ mb: 2 }}>
            {bulkResult?.message ?? "Bulk upload finished."}
          </Typography>
          <Typography>
            Total rows: {bulkResult?.total ?? 0}, inserted: {bulkResult?.inserted ?? 0}, skipped: {bulkResult?.skipped ?? 0}
          </Typography>
          {bulkResult?.errors && bulkResult.errors.length > 0 ? (
            <Box sx={{ mt: 2 }}>
              <Typography variant="subtitle2">Errors</Typography>
              {bulkResult.errors.map((error) => (
                <Typography key={error.row} sx={{ fontSize: 14 }}>
                  Row {error.row}: {error.message}
                </Typography>
              ))}
            </Box>
          ) : null}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setBulkDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </ModulePageLayout>
  );
}
