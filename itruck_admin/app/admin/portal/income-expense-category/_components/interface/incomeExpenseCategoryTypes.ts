export interface FilterState {
  type: "" | "income" | "expense";
  search: string;
}

export interface FormState {
  type: "income" | "expense";
  categoryName: string;
  status: "Active" | "Inactive";
}

/** Setter for one form field; use this on dialog props so generics match `useForm`’s `setFieldValue`. */
export type SetFormFieldFn = <K extends keyof FormState>(key: K, value: FormState[K]) => void;

export const EMPTY_FORM: FormState = {
  type: "income",
  categoryName: "",
  status: "Active",
};

export const EMPTY_FILTERS: FilterState = {
  type: "",
  search: "",
};

