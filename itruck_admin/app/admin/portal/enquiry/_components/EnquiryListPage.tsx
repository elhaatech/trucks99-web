"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Box from "@mui/material/Box";
import Pagination from "@mui/material/Pagination";

import type { ContactEnquiry, ContactEnquiryStatus, User } from "@/model/api";
import {
  deleteContactEnquiry,
  getContactEnquiries,
  getCurrentUser,
  getRowId,
  updateContactEnquiryStatus,
} from "@/model/api";
import { canModuleAction } from "@/lib/permissions";
import { routes } from "@/lib/routes";
import { useNotification } from "@/hooks/useNotification";
import { useFilters } from "@/hooks/useFilters";
import { useConfirmDialog } from "@/hooks/useConfirmDialog";

import {
  DataTable,
  ConfirmDialog,
  ModulePageLayout,
  type DataTableAction,
} from "@/components/common";
import { ViewIcon, DeleteIcon } from "@/components/ui/Icons";
import MarkEmailReadOutlinedIcon from "@mui/icons-material/MarkEmailReadOutlined";
import TaskAltOutlinedIcon from "@mui/icons-material/TaskAltOutlined";
import MarkEmailUnreadOutlinedIcon from "@mui/icons-material/MarkEmailUnreadOutlined";

import { useEnquiryColumns } from "./EnquiryColumns";
import {
  EnquiryFilters,
  EMPTY_ENQUIRY_FILTERS,
  type EnquiryFilterState,
} from "./EnquiryFilters";

type DeleteCtx = { row: ContactEnquiry };
type StatusCtx = { row: ContactEnquiry; status: ContactEnquiryStatus };

export function EnquiryListPage() {
  const router = useRouter();
  const { notify } = useNotification();

  const { filters, setFiltersPatch, resetFilters } =
    useFilters<EnquiryFilterState>(EMPTY_ENQUIRY_FILTERS);
  const [appliedFilters, setAppliedFilters] =
    useState<EnquiryFilterState>(EMPTY_ENQUIRY_FILTERS);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const [items, setItems] = useState<ContactEnquiry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  const {
    open: deleteOpen,
    target: deleteTarget,
    openWith: openDeleteConfirm,
    close: closeDeleteConfirm,
  } = useConfirmDialog<DeleteCtx>();

  const {
    open: statusOpen,
    target: statusTarget,
    openWith: openStatusConfirm,
    close: closeStatusConfirm,
  } = useConfirmDialog<StatusCtx>();

  const loadAll = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await getContactEnquiries({
        page,
        limit: 20,
        search: appliedFilters.search,
        status: (appliedFilters.status || "all") as ContactEnquiryStatus | "all",
      });
      setItems(res.data ?? []);
      setTotalPages(Number(res.pagination?.totalPages) || 1);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to load enquiries";
      setError(msg);
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [appliedFilters.search, appliedFilters.status, page]);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  useEffect(() => {
    getCurrentUser()
      .then((u) => setCurrentUser(u as User))
      .catch(() => setCurrentUser(null));
  }, []);

  const handleSearch = useCallback(() => {
    setPage(1);
    setAppliedFilters({
      search: filters.search.trim(),
      status: filters.status,
    });
  }, [filters.search, filters.status]);

  const handleClear = useCallback(() => {
    resetFilters();
    setAppliedFilters(EMPTY_ENQUIRY_FILTERS);
    setPage(1);
  }, [resetFilters]);

  const columns = useEnquiryColumns();
  const canView = canModuleAction(currentUser?.role, "contact_enquiry", "view");
  const canEdit = canModuleAction(currentUser?.role, "contact_enquiry", "update");
  const canDelete = canModuleAction(currentUser?.role, "contact_enquiry", "delete");

  const handleConfirmDelete = useCallback(async () => {
    if (!deleteTarget) return;
    try {
      await deleteContactEnquiry(getRowId(deleteTarget.row));
      notify({ type: "danger", message: "Enquiry deleted successfully." });
      await loadAll();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Delete failed";
      setError(msg);
      notify({ type: "error", message: msg });
    }
  }, [deleteTarget, loadAll, notify]);

  const handleConfirmStatus = useCallback(async () => {
    if (!statusTarget) return;
    try {
      await updateContactEnquiryStatus(
        getRowId(statusTarget.row),
        statusTarget.status,
      );
      notify({ type: "success", message: `Enquiry marked as ${statusTarget.status}.` });
      await loadAll();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Status update failed";
      setError(msg);
      notify({ type: "error", message: msg });
    }
  }, [loadAll, notify, statusTarget]);

  const rowActions = useCallback(
    (row: ContactEnquiry): DataTableAction<ContactEnquiry>[] => {
      const actions: DataTableAction<ContactEnquiry>[] = [];
      const status = String(row.status || "new").toLowerCase();

      if (canView) {
        actions.push({
          label: "View",
          icon: <ViewIcon />,
          onClick: (r) => router.push(routes.enquiry.view(getRowId(r))),
        });
      }

      if (canEdit && status !== "read") {
        actions.push({
          label: "Mark read",
          icon: <MarkEmailReadOutlinedIcon fontSize="small" />,
          onClick: (r) => openStatusConfirm({ row: r, status: "read" }),
        });
      }

      if (canEdit && status !== "closed") {
        actions.push({
          label: "Mark closed",
          icon: <TaskAltOutlinedIcon fontSize="small" />,
          color: "success",
          onClick: (r) => openStatusConfirm({ row: r, status: "closed" }),
        });
      }

      if (canEdit && status !== "new") {
        actions.push({
          label: "Mark new",
          icon: <MarkEmailUnreadOutlinedIcon fontSize="small" />,
          onClick: (r) => openStatusConfirm({ row: r, status: "new" }),
        });
      }

      if (canDelete) {
        actions.push({
          label: "Delete",
          icon: <DeleteIcon />,
          color: "error",
          onClick: (r) => openDeleteConfirm({ row: r }),
        });
      }

      return actions;
    },
    [canDelete, canEdit, canView, openDeleteConfirm, openStatusConfirm, router],
  );

  return (
    <ModulePageLayout
      title="Enquiry"
      subtitle="Contact form submissions from the website."
      breadcrumbs={[
        { label: "Dashboard", href: routes.dashboard() },
        { label: "Enquiry" },
      ]}
      error={error}
      onErrorClose={() => setError("")}
      showAds={false}
    >
      <EnquiryFilters
        filters={filters}
        onChange={setFiltersPatch}
        onSearch={handleSearch}
        onClear={handleClear}
        disabled={loading}
      />

      <DataTable<ContactEnquiry>
        columns={columns}
        rows={items}
        getRowId={getRowId}
        loading={loading}
        emptyMessage="No enquiries yet."
        actions={rowActions}
      />

      {totalPages > 1 ? (
        <Box sx={{ display: "flex", justifyContent: "center", mt: 3 }}>
          <Pagination
            count={totalPages}
            page={page}
            onChange={(_, value) => setPage(value)}
            color="primary"
          />
        </Box>
      ) : null}

      <ConfirmDialog
        open={deleteOpen}
        onClose={closeDeleteConfirm}
        onConfirm={handleConfirmDelete}
        title="Delete enquiry?"
        description={
          deleteTarget
            ? `This will permanently delete the enquiry from ${deleteTarget.row.name}.`
            : undefined
        }
        confirmLabel="Delete"
        confirmColor="error"
        pendingLabel="Deleting…"
      />

      <ConfirmDialog
        open={statusOpen}
        onClose={closeStatusConfirm}
        onConfirm={handleConfirmStatus}
        title={
          statusTarget
            ? `Mark enquiry as ${statusTarget.status}?`
            : "Update status?"
        }
        description={
          statusTarget
            ? `This will set ${statusTarget.row.name}'s enquiry to ${statusTarget.status}.`
            : undefined
        }
        confirmLabel="Update"
      />
    </ModulePageLayout>
  );
}
