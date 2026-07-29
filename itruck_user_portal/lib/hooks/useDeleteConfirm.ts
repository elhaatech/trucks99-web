"use client";

import { useCallback, useState } from "react";

export interface UseDeleteConfirmOptions<T> {
  onDeleteSingle: (item: T) => Promise<void>;
  onDeleteBulk: (ids: string[]) => Promise<void>;
  getRowId: (item: T) => string;
  getLabel?: (item: T) => string;
}

export interface UseDeleteConfirmReturn<T> {
  confirmOpen: boolean;
  confirmTarget: T | null;
  confirmBulk: boolean;
  openConfirmSingle: (item: T) => void;
  openConfirmBulk: () => void;
  handleConfirm: () => Promise<void>;
  onClose: () => void;
  confirmTitle: string;
  confirmDescription: React.ReactNode;
}

/**
 * Shared hook for delete confirmation flow (single item or bulk).
 * Use with ConfirmDialog and DataTable selectedIds.
 */
export function useDeleteConfirm<T>({
  onDeleteSingle,
  onDeleteBulk,
  getRowId,
  getLabel,
}: UseDeleteConfirmOptions<T>): UseDeleteConfirmReturn<T> & {
  setConfirmOpen: (open: boolean) => void;
  selectedIds: string[];
  setSelectedIds: (ids: string[] | ((prev: string[]) => string[])) => void;
} {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmTarget, setConfirmTarget] = useState<T | null>(null);
  const [confirmBulk, setConfirmBulk] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const openConfirmSingle = useCallback((item: T) => {
    setConfirmTarget(item);
    setConfirmBulk(false);
    setConfirmOpen(true);
  }, []);

  const openConfirmBulk = useCallback(() => {
    if (selectedIds.length === 0) return;
    setConfirmBulk(true);
    setConfirmTarget(null);
    setConfirmOpen(true);
  }, [selectedIds.length]);

  const handleConfirm = useCallback(async () => {
    if (confirmBulk) {
      await onDeleteBulk(selectedIds);
      setSelectedIds([]);
    } else if (confirmTarget) {
      await onDeleteSingle(confirmTarget);
    }
  }, [confirmBulk, confirmTarget, selectedIds, onDeleteSingle, onDeleteBulk]);

  const onClose = useCallback(() => {
    setConfirmOpen(false);
    setConfirmTarget(null);
    setConfirmBulk(false);
  }, []);

  const label = confirmTarget && getLabel ? getLabel(confirmTarget) : null;
  const confirmTitle = confirmBulk ? "Delete selected?" : "Delete?";
  const confirmDescription = confirmBulk
    ? `Permanently delete ${selectedIds.length} item(s)?`
    : label != null
      ? `Permanently delete "${label}"?`
      : "This action cannot be undone.";

  return {
    confirmOpen,
    confirmTarget,
    confirmBulk,
    openConfirmSingle,
    openConfirmBulk,
    handleConfirm,
    onClose,
    setConfirmOpen,
    confirmTitle,
    confirmDescription,
    selectedIds,
    setSelectedIds,
  };
}
