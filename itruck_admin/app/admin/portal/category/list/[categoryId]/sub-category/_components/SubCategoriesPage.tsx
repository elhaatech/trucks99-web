"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import {
  Alert,
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
  BackButton,
  ConfirmDialog,
  DataTable,
  ModulePageLayout,
  createdAtColumn,
} from "@/components/common";
import { DeleteIcon, EditIcon, ViewIcon } from "@/components/ui/Icons";
import { routes } from "@/lib/routes";
import { useNotification } from "@/hooks/useNotification";
import {
  type SubCategory,
  deleteSubCategory,
  getSubCategories,
  getSubCategoryRowId,
  bulkUploadSubCategories,
  type BulkUploadResult,
} from "@/model/services/sub-category";
import {
  type Category,
  getCategories,
  getCategoryUuid,
} from "@/model/services/category";
import { renderClickableName } from "@/components/common/table/tableColumnHelpers";

export function SubCategoriesPage({ categoryId }: { categoryId: string }) {
  const router = useRouter();
  const { notify } = useNotification();

  const [rows, setRows] = useState<SubCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [deleteSub, setDeleteSub] = useState<SubCategory | null>(null);
  const [filterCategory, setFilterCategory] = useState<Category | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [bulkUploading, setBulkUploading] = useState(false);
  const [bulkResult, setBulkResult] = useState<BulkUploadResult | null>(null);
  const [bulkDialogOpen, setBulkDialogOpen] = useState(false);
  const [normalizedCategoryId, setNormalizedCategoryId] = useState<string>("");

  useEffect(() => {
    getCategories()
      .then((data) => {
        const match = data.find(
          (c) => c._id === categoryId || c.id === categoryId,
        );

        if (match) {
          setNormalizedCategoryId(getCategoryUuid(match));
          setFilterCategory(match);
        }
      })
      .catch(() => {
        notify({ type: "error", message: "Failed to load category" });
      });
  }, [categoryId, notify]);

  const loadSubCategories = useCallback(async () => {
    if (!normalizedCategoryId) return;

    setLoading(true);
    setError("");

    try {
      const data = await getSubCategories(normalizedCategoryId, {
        includeInactive: true,
      });
      setRows(data);
    } catch (e) {
      const msg =
        e instanceof Error ? e.message : "Failed to load sub-categories";

      setError(msg);
      notify({ type: "error", message: msg });
    } finally {
      setLoading(false);
    }
  }, [notify, normalizedCategoryId]);

  useEffect(() => {
    void loadSubCategories();
  }, [loadSubCategories]);

  const onConfirmDeleteSubCategory = async () => {
    if (!deleteSub) return;

    try {
      await deleteSubCategory([getSubCategoryRowId(deleteSub)]);
      setDeleteSub(null);

      notify({
        type: "success",
        message: "Sub-category deleted successfully.",
      });

      await loadSubCategories();
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
      const result = await bulkUploadSubCategories(file);
      setBulkResult(result);
      setBulkDialogOpen(true);
      notify({
        type: "success",
        message: `Bulk upload complete: ${result.inserted ?? 0} added, ${result.skipped ?? 0} skipped.`,
      });
      await loadSubCategories();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Bulk upload failed";
      notify({ type: "error", message: msg });
    } finally {
      setBulkUploading(false);
    }
  };

  const subCategoryColumns = useMemo(
    () => [
      {
        id: "sub_category_name",
        label: "Sub-Category Name",
        render: (row: SubCategory) =>
          renderClickableName(
            row.sub_category_name || "",
            routes.subCategory.view(categoryId, getSubCategoryRowId(row)),
          ),
      },
      {
        id: "category",
        label: "Category",
        render: (row: SubCategory) => {
          const rowCatId = row.category_id;

          return (
            row.category?.category_name ??
            (rowCatId === normalizedCategoryId
              ? (filterCategory?.category_name ?? "-")
              : "-")
          );
        },
      },
      {
        id: "status",
        label: "Status",
        render: (row: SubCategory) => (
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
        label: "Created By",
        render: (row: SubCategory) => row.created_by ?? "-",
      },
      createdAtColumn<SubCategory>(),
    ],
    [categoryId, filterCategory, normalizedCategoryId],
  );

  const subCatActions = (row: SubCategory): DataTableAction<SubCategory>[] => {
    const id = getSubCategoryRowId(row);

    return [
      {
        label: "View",
        icon: <ViewIcon />,
        onClick: () => router.push(routes.subCategory.view(categoryId, id)),
      },
      {
        label: "Edit",
        icon: <EditIcon />,
        onClick: () => router.push(routes.subCategory.edit(categoryId, id)),
      },
      {
        label: "Delete",
        icon: <DeleteIcon />,
        onClick: () => setDeleteSub(row),
        color: "error",
      },
    ];
  };

  return (
    <ModulePageLayout
      title="Sub-Categories"
      subtitle={
        filterCategory
          ? `Showing sub-categories for ${filterCategory.category_name}`
          : "Manage product sub-categories."
      }
      breadcrumbs={[
        { label: "Dashboard", href: routes.dashboard() },
        { label: "Categories", href: routes.category.list() },
        { label: filterCategory?.category_name ?? "Sub-Categories" },
      ]}
      backButton={
        <BackButton fallback={routes.category.list()} label="Back to Categories" />
      }
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
            onClick={() => router.push(routes.subCategory.create(categoryId))}
          >
            Add Sub-Category
          </Button>
        </Stack>
      }
    >
      {!normalizedCategoryId && !loading ? (
        <Alert severity="warning" sx={{ mb: 2 }}>
          Category not found. Sub-categories cannot be loaded.
        </Alert>
      ) : null}

      <DataTable
        columns={subCategoryColumns}
        rows={rows}
        getRowId={getSubCategoryRowId}
        loading={loading}
        actions={subCatActions}
      />

      <ConfirmDialog
        open={!!deleteSub}
        onClose={() => setDeleteSub(null)}
        onConfirm={onConfirmDeleteSubCategory}
        title="Delete sub-category?"
        description={`This will permanently delete "${
          deleteSub?.sub_category_name || ""
        }".`}
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
