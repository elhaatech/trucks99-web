export interface FilterState {
  search: string;
}

export interface FormState {
  vehicleName: string;
  imageUrl: string;
  hasWheelVariants: "Yes" | "No";
  availableWheelsCount: number[];
  hasLengthVariants: "Yes" | "No";
  availableLengths: number[];
}

/** Setter for one form field; use this on dialog props so generics match `useForm`’s `setFieldValue`. */
export type SetFormFieldFn = <K extends keyof FormState>(key: K, value: FormState[K]) => void;

export const EMPTY_FORM: FormState = {
  vehicleName: "",
  imageUrl: "",
  hasWheelVariants: "No",
  availableWheelsCount: [],
  hasLengthVariants: "No",
  availableLengths: [],
};

export const EMPTY_FILTERS: FilterState = {
  search: "",
};

