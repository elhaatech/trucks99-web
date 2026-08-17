export interface FilterState {
  search: string;
}

export interface FormState {
  name: string;
  mobile: string;
  companyName: string;
  city: string;
  state: string;
  country: string;
  profileImage: string;
  roleId: string;
}

/** Setter for one form field; use this on dialog props so generics match `useForm`'s `setFieldValue`. */
export type SetFormFieldFn = <K extends keyof FormState>(key: K, value: FormState[K]) => void;

export const EMPTY_FORM: FormState = {
  name: "",
  mobile: "",
  companyName: "",
  city: "",
  state: "",
  country: "",
  profileImage: "",
  roleId: "",
};


// ─── Filter state ────────────────────────────────────────────────────────────

export interface FilterState {
  search: string;
  /** Role UUID */
  role?: string;
  state?: string;
  city?: string;
  /** ISO date string "YYYY-MM-DD" */
  dojFrom?: string;
  /** ISO date string "YYYY-MM-DD" */
  dojTo?: string;
}

export const EMPTY_FILTERS: FilterState = {
  search: "",
  role: undefined,
  state: undefined,
  city: undefined,
  dojFrom: undefined,
  dojTo: undefined,
};
export const EMPTY_USER_FORM = {
  name: "",
  mobile: "",
  company_name: "",
  email: "",
  roleId: "",
  city: "",
  state: "",
  country: "India",   // ← default country
  status: "active",
};