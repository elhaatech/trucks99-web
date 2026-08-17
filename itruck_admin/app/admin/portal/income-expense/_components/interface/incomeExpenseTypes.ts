export interface FilterState {
  type: "" | "income" | "expense";
  search: string;
}

export interface FormState {
  userId: string;
  type: "income" | "expense";
  categoryId: string;
  remarks: string;
  amount: string;
}

/** Setter for one form field; use this on dialog props so generics match `useForm`’s `setFieldValue`. */
export type SetFormFieldFn = <K extends keyof FormState>(key: K, value: FormState[K]) => void;

export const EMPTY_FORM: FormState = {
  userId: "",
  type: "income",
  categoryId: "",
  remarks: "",
  amount: "",
};

export const EMPTY_FILTERS: FilterState = {
  type: "",
  search: "",
};

