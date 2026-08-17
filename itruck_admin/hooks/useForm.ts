"use client";

import { useCallback, useRef, useState } from "react";

export interface UseFormReturn<T extends object> {
  values: T;
  handleChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void;
  handleBlur: (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  setFieldValue: <K extends keyof T>(name: K, value: T[K]) => void;
  setValues: (updater: T | ((prev: T) => T)) => void;
  resetForm: () => void;
  errors: Partial<Record<keyof T, string>>;
  setErrors: React.Dispatch<React.SetStateAction<Partial<Record<keyof T, string>>>>;
  touched: Partial<Record<keyof T, boolean>>;
}

/**
 * Single object state for form fields. Prefer name + handleChange on native inputs;
 * for controlled MUI helpers use setFieldValue / setValues.
 */
export function useForm<T extends object>(initialValues: T): UseFormReturn<T> {
  const initialRef = useRef<T>(initialValues);
  initialRef.current = initialValues;

  const [values, setValuesState] = useState<T>(() => ({ ...initialValues }));
  const [errors, setErrors] = useState<Partial<Record<keyof T, string>>>({});
  const [touched, setTouched] = useState<Partial<Record<keyof T, boolean>>>({});

  const setValues = useCallback((updater: T | ((prev: T) => T)) => {
    setValuesState((prev) => (typeof updater === "function" ? (updater as (p: T) => T)(prev) : updater));
  }, []);

  const setFieldValue = useCallback(<K extends keyof T>(name: K, value: T[K]) => {
    setValuesState((prev) => ({ ...(prev as object), [name]: value } as T));
  }, []);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    if (!name) return;
    const next =
      type === "checkbox"
        ? (e.target as HTMLInputElement).checked
        : value;
    setValuesState((prev) => ({ ...(prev as object), [name]: next } as T));
  }, []);

  const handleBlur = useCallback((e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name } = e.target;
    if (!name) return;
    setTouched((t) => ({ ...t, [name as keyof T]: true }));
  }, []);

  const resetForm = useCallback(() => {
    const next = { ...(initialRef.current as object) } as T;
    setValuesState(next);
    setErrors({});
    setTouched({});
  }, []);

  return {
    values,
    handleChange,
    handleBlur,
    setFieldValue,
    setValues,
    resetForm,
    errors,
    setErrors,
    touched,
  };
}
