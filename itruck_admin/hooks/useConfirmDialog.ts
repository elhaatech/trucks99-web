"use client";

import { useCallback, useState } from "react";

export interface UseConfirmDialogReturn<T = unknown> {
  open: boolean;
  target: T | null;
  openWith: (target?: T | null) => void;
  close: () => void;
}

export function useConfirmDialog<T = unknown>(): UseConfirmDialogReturn<T> {
  const [open, setOpen] = useState(false);
  const [target, setTarget] = useState<T | null>(null);

  const openWith = useCallback((t?: T | null) => {
    setTarget(t ?? null);
    setOpen(true);
  }, []);

  const close = useCallback(() => {
    setOpen(false);
    setTarget(null);
  }, []);

  return { open, target, openWith, close };
}
