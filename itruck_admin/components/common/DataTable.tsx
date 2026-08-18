"use client";

import * as React from "react";
import Box from "@mui/material/Box";
import Paper from "@mui/material/Paper";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import TableSortLabel from "@mui/material/TableSortLabel";
import Typography from "@mui/material/Typography";
import IconButton from "@mui/material/IconButton";
import Checkbox from "@mui/material/Checkbox";
import TablePagination from "@mui/material/TablePagination";
import { ListEmptyState } from "./ListEmptyState";
import { TableSkeleton } from "@/components/ui/Skeleton";
import { getDateTimestamp, isDateSortColumn } from "@/lib/dateUtils";

const headerCellSx = {
  fontWeight: 700,
  fontSize: "0.8125rem",
  bgcolor: "rgba(15, 23, 42, 0.025)",
  color: "text.secondary",
  borderBottom: "1px solid",
  borderColor: "divider",
  py: 1.75,
  whiteSpace: "nowrap" as const,
} as const;

type Order = "asc" | "desc";

export interface DataTableColumn<T> {
  id: string;
  label: string;
  align?: "left" | "center" | "right";
  minWidth?: number;
  sortable?: boolean;
  render?: (row: T) => React.ReactNode;
}

export interface DataTableAction<T> {
  label: string;
  icon: React.ReactNode;
  onClick: (row: T) => void;
  color?: "primary" | "secondary" | "success" | "error" | "default";
  disabled?: boolean;
}

export interface DataTableProps<T> {
  columns: DataTableColumn<T>[];
  rows: T[];
  getRowId: (row: T) => string;
  actions?: DataTableAction<T>[] | ((row: T) => DataTableAction<T>[]);
  loading?: boolean;
  emptyMessage?: string;
  stickyHeader?: boolean;
  selectable?: boolean;
  selectedIds?: string[];
  onSelectionChange?: (selectedIds: string[]) => void;

  // ── Server-side pagination ──────────────────────────────────────────────────
  totalCount?: number;
  /** 0-based page index (server-side mode). */
  page?: number;
  pageSize?: number;
  onPageChange?: (newPage: number) => void;
  onPageSizeChange?: (newPageSize: number) => void;
}

function stableSort<T>(array: T[], orderBy: string, order: Order): T[] {
  return [...array].sort((a, b) => {
    const aVal = (a as Record<string, unknown>)[orderBy];
    const bVal = (b as Record<string, unknown>)[orderBy];

    if (isDateSortColumn(orderBy)) {
      const aTs = getDateTimestamp(
        aVal as string | Date | number | null | undefined,
      );
      const bTs = getDateTimestamp(
        bVal as string | Date | number | null | undefined,
      );

      if (aTs == null && bTs == null) return 0;
      if (aTs == null) return 1;
      if (bTs == null) return -1;
      if (aTs < bTs) return order === "asc" ? -1 : 1;
      if (aTs > bTs) return order === "asc" ? 1 : -1;
      return 0;
    }

    const aStr = aVal == null ? "" : String(aVal).toLowerCase();
    const bStr = bVal == null ? "" : String(bVal).toLowerCase();

    if (aStr < bStr) return order === "asc" ? -1 : 1;
    if (aStr > bStr) return order === "asc" ? 1 : -1;
    return 0;
  });
}

export function DataTable<T>({
  columns,
  rows,
  getRowId,
  actions = [],
  loading = false,
  emptyMessage = "No data",
  stickyHeader = false,
  selectable = false,
  selectedIds = [],
  onSelectionChange,
  // server-side pagination props
  totalCount,
  page: externalPage,
  pageSize: externalPageSize,
  onPageChange,
  onPageSizeChange,
}: DataTableProps<T>) {
  // ── Determine mode ─────────────────────────────────────────────────────────
  const isServerSide = totalCount !== undefined && onPageChange !== undefined;

  // ── Internal state (client-side mode only) ─────────────────────────────────
  const [internalPage, setInternalPage] = React.useState(0);
  const [internalRowsPerPage, setInternalRowsPerPage] = React.useState(5);

  // ── Unified page / pageSize values ────────────────────────────────────────
  const page        = isServerSide ? (externalPage ?? 0)      : internalPage;
  const rowsPerPage = isServerSide ? (externalPageSize ?? 10) : internalRowsPerPage;

  // ── Sorting state ──────────────────────────────────────────────────────────
  const [orderBy, setOrderBy] = React.useState<string | null>(null);
  const [order,   setOrder]   = React.useState<Order>("asc");

  const handleSortClick = (colId: string) => {
    if (orderBy === colId) {
      setOrder((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setOrderBy(colId);
      setOrder("asc");
    }
    if (isServerSide) {
      onPageChange?.(0);
    } else {
      setInternalPage(0);
    }
  };

  // ── Rows to display (current page) ────────────────────────────────────────
  const displayRows = React.useMemo(() => {
    if (isServerSide) {
      if (!orderBy) return rows;
      return stableSort(rows, orderBy, order);
    }
    const sorted = orderBy ? stableSort(rows, orderBy, order) : rows;
    const start  = page * rowsPerPage;
    return sorted.slice(start, start + rowsPerPage);
  }, [isServerSide, rows, orderBy, order, page, rowsPerPage]);

  // ── All row IDs (entire dataset, not just current page) ───────────────────
  const allRowIds = React.useMemo(
    () => rows.map((r) => getRowId(r)),
    [rows, getRowId]
  );

  // ── Selection helpers ──────────────────────────────────────────────────────
  const selectedSet   = React.useMemo(() => new Set(selectedIds), [selectedIds]);

  /**
   * "All selected" means every row in the FULL dataset is selected,
   * not just the visible page. This ensures the header checkbox reflects
   * the true global selection state.
   */
  const allSelected  = allRowIds.length > 0 && allRowIds.every((id) => selectedSet.has(id));

  /**
   * "Some selected" is true when at least one row anywhere in the dataset
   * is selected but not all of them — drives the indeterminate state.
   */
  const someSelected = selectedIds.length > 0 && !allSelected;

  // Reset internal page when rows shrink (client-side mode only)
  React.useEffect(() => {
    if (!isServerSide && internalPage * internalRowsPerPage >= rows.length && internalPage > 0) {
      setInternalPage(0);
    }
  }, [isServerSide, rows.length, internalPage, internalRowsPerPage]);

  // ── Handlers ───────────────────────────────────────────────────────────────

  /**
   * FIX: Select/deselect ALL rows across the entire dataset (all pages),
   * not just the rows visible on the current page.
   */
  const handleSelectAll = () => {
    if (!onSelectionChange) return;
    if (allSelected) {
      // Deselect everything
      onSelectionChange([]);
    } else {
      // Select every row in the full dataset
      onSelectionChange(allRowIds);
    }
  };

  const handleSelectRow = (id: string) => {
    if (!onSelectionChange) return;
    if (selectedSet.has(id)) {
      onSelectionChange(selectedIds.filter((s) => s !== id));
    } else {
      onSelectionChange([...selectedIds, id]);
    }
  };

  const handlePageChange = (_: unknown, newPage: number) => {
    if (isServerSide) {
      onPageChange?.(newPage);
    } else {
      setInternalPage(newPage);
    }
  };

  const handleRowsPerPageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value, 10);
    if (isServerSide) {
      onPageSizeChange?.(val);
      onPageChange?.(0);
    } else {
      setInternalRowsPerPage(val);
      setInternalPage(0);
    }
  };

  // ── Actions helpers ────────────────────────────────────────────────────────
  const hasActions =
    typeof actions === "function" ? true : Array.isArray(actions) && actions.length > 0;

  const getRowActions = (row: T): DataTableAction<T>[] =>
    typeof actions === "function" ? actions(row) : Array.isArray(actions) ? actions : [];

  const colSpan = (selectable ? 1 : 0) + columns.length + (hasActions ? 1 : 0);

  // ── Total count for pagination control ────────────────────────────────────
  const paginationTotal = isServerSide ? totalCount! : rows.length;

  return (
    <Paper
      elevation={0}
      sx={{
        borderRadius: "12px",
        border: "1px solid",
        borderColor: "divider",
        overflow: "hidden",
        boxShadow: (t) => t.tokens?.shadow?.card,
      }}
    >
      {/* Selection count banner */}
      {selectable && selectedIds.length > 0 && (
        <Box
          sx={{
            px: 2,
            py: 1,
            bgcolor: "primary.50",
            borderBottom: "1px solid",
            borderColor: "divider",
            display: "flex",
            alignItems: "center",
            gap: 1,
          }}
        >
          <Typography variant="body2" color="primary.main" fontWeight={500}>
            {selectedIds.length} of {paginationTotal} row(s) selected
          </Typography>
          {!allSelected && (
            <Typography
              variant="body2"
              color="primary.main"
              sx={{ cursor: "pointer", textDecoration: "underline", ml: 1 }}
              onClick={() => onSelectionChange?.(allRowIds)}
            >
              Select all {paginationTotal}
            </Typography>
          )}
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ cursor: "pointer", textDecoration: "underline", ml: 1 }}
            onClick={() => onSelectionChange?.([])}
          >
            Clear selection
          </Typography>
        </Box>
      )}

      <TableContainer
        className="custom-scrollbar"
        sx={{ maxHeight: 560, minHeight: 300 }}
      >
        {loading ? (
          <TableSkeleton
            rows={rowsPerPage}
            columns={colSpan}
            showHeader
          />
        ) : (
        <Table stickyHeader={stickyHeader} size="medium">
          <TableHead>
            <TableRow>
              {selectable && (
                <TableCell padding="checkbox" sx={{ ...headerCellSx, width: 48 }}>
                  <Checkbox
                    indeterminate={someSelected}
                    checked={allSelected}
                    onChange={handleSelectAll}
                    disabled={loading || rows.length === 0}
                    size="small"
                    inputProps={{ "aria-label": "Select all rows" }}
                  />
                </TableCell>
              )}

              {columns.map((col) => (
                <TableCell
                  key={col.id}
                  align={col.align ?? "left"}
                  sx={{ minWidth: col.minWidth, ...headerCellSx }}
                  sortDirection={orderBy === col.id ? order : false}
                >
                  {col.sortable ? (
                    <TableSortLabel
                      active={orderBy === col.id}
                      direction={orderBy === col.id ? order : "asc"}
                      onClick={() => handleSortClick(col.id)}
                      sx={{
                        fontWeight: 700,
                        color: "text.secondary",
                        "&.Mui-active": { color: "primary.main" },
                        "& .MuiTableSortLabel-icon": { opacity: 0.4 },
                        "&.Mui-active .MuiTableSortLabel-icon": { opacity: 1 },
                      }}
                    >
                      {col.label}
                    </TableSortLabel>
                  ) : (
                    col.label
                  )}
                </TableCell>
              ))}

              {hasActions && (
                <TableCell align="right" sx={{ ...headerCellSx, width: 140, minWidth: 140 }}>
                  Actions
                </TableCell>
              )}
            </TableRow>
          </TableHead>

          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={colSpan} align="center" sx={{ py: 6, borderBottom: 0 }}>
                  <ListEmptyState title={emptyMessage} />
                </TableCell>
              </TableRow>
            ) : (
              displayRows.map((row) => {
                const id         = getRowId(row);
                const isSelected = selectedSet.has(id);
                return (
                  <TableRow
                    key={id}
                    hover
                    selected={selectable && isSelected}
                    sx={{
                      height: 56,
                      transition: "background-color 0.15s ease",
                      "&:last-child td": { borderBottom: 0 },
                      "&:hover": { bgcolor: "action.hover" },
                    }}
                  >
                    {selectable && (
                      <TableCell
                        padding="checkbox"
                        sx={{ borderBottom: "1px solid", borderColor: "divider" }}
                      >
                        <Checkbox
                          checked={isSelected}
                          onChange={() => handleSelectRow(id)}
                          size="small"
                          inputProps={{ "aria-label": `Select row ${id}` }}
                        />
                      </TableCell>
                    )}

                    {columns.map((col) => (
                      <TableCell
                        key={col.id}
                        align={col.align ?? "left"}
                        sx={{
                          borderBottom: "1px solid",
                          borderColor: "divider",
                          py: 1,
                          verticalAlign: "middle",
                        }}
                      >
                        {col.render
                          ? col.render(row)
                          : ((row as Record<string, unknown>)[col.id] as React.ReactNode)}
                      </TableCell>
                    ))}

                    {hasActions && (
                      <TableCell
                        align="right"
                        sx={{
                          borderBottom: "1px solid",
                          borderColor: "divider",
                          width: 140,
                          minWidth: 140,
                        }}
                      >
                        <Box
                          sx={{
                            display: "flex",
                            gap: 0.5,
                            justifyContent: "flex-end",
                            flexWrap: "nowrap",
                          }}
                        >
                          {getRowActions(row).map((action, idx) => (
                            <IconButton
                              key={idx}
                              size="small"
                              color={action.color ?? "default"}
                              disabled={!!action.disabled}
                              onClick={() => action.onClick(row)}
                              title={action.label}
                              aria-label={action.label}
                              sx={{
                                "&:hover": {
                                  bgcolor:
                                    action.color === "error"
                                      ? "error.light"
                                      : action.color === "success"
                                      ? "success.light"
                                      : undefined,
                                },
                              }}
                            >
                              {action.icon}
                            </IconButton>
                          ))}
                        </Box>
                      </TableCell>
                    )}
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
        )}
      </TableContainer>

      <TablePagination
        component="div"
        count={paginationTotal}
        page={page}
        onPageChange={handlePageChange}
        rowsPerPage={rowsPerPage}
        onRowsPerPageChange={handleRowsPerPageChange}
        rowsPerPageOptions={[5, 10, 25, 50]}
      />
    </Paper>
  );
}