export interface FilterState {
  search: string;
}

export interface FormState {
  materialsType: string;
}

/** Setter for one form field; use this on dialog props so generics match `useForm`’s `setFieldValue`. */
export type SetFormFieldFn = <K extends keyof FormState>(key: K, value: FormState[K]) => void;

export const EMPTY_FORM: FormState = {
  materialsType: "",
};

export const EMPTY_FILTERS: FilterState = {
  search: "",
};

