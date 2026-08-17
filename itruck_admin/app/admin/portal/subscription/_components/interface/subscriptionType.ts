export interface FilterState {
  search: string;
  fieldName: string;
}

export interface FormState {
  packageName: string;
  packageType: string;
  fieldName: string;
  price: string;
  durationDays: string;
  status: "active" | "inactive";
  description: string;
  features: string;
}

export const EMPTY_FILTERS: FilterState = {
  search: "",
  fieldName: "",
};

export const EMPTY_FORM: FormState = {
  packageName: "",
  packageType: "",
  fieldName: "",
  price: "",
  durationDays: "",
  status: "active",
  description: "",
  features: "",
};