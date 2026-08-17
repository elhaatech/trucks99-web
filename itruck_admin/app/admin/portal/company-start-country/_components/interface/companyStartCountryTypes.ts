export interface FilterState {
  search: string;
}

export interface FormState {
  city: string;
  state: string;
  country: string;
}

export const EMPTY_FILTERS: FilterState = {
  search: "",
};

export const EMPTY_FORM: FormState = {
  city: "",
  state: "",
  country: "",
};

