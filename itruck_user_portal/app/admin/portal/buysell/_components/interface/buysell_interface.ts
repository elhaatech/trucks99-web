export type FormSpecification = {
  specification_id: string;
  specification_value: string;
};

export type FormState = {
  category_id: string;
  subcategory_id: string;
  price: string;
  description: string;
  images: string[];
  specifications: FormSpecification[];
  country_id: string;
  state_id: string;
  city_id: string;
  address: string;
  pincode: string;
  status: "active" | "inactive" | "pending" | "draft" | "rejected" | "booking" | "purchased" | "sold";
};

export type FilterState = {
  userid: string;
  usear_type: "" | "buy" | "sell" | "all";
  search: string;
  category_id: string;
  subcategory_id: string;
  status: string;
  user_type: "" | "buy" | "sell";
  min_price: string;
  max_price: string;
  no_of_owners_min: string;
  no_of_owners_max: string;
  km_min: string;
  km_max: string;
  make_year_min: string;
  make_year_max: string;
  city_id: string;
};

export const EMPTY_FORM: FormState = {
  category_id: "",
  subcategory_id: "",
  price: "",
  description: "",
  images: [],
  specifications: [],
  country_id: "",
  state_id: "",
  city_id: "",
  address: "",
  pincode: "",
  status: "pending",
};

export const EMPTY_FILTERS: FilterState = {
  search: "",
  category_id: "",
  subcategory_id: "",
  status: "",
  user_type: "",
  usear_type: "all",
  userid: "",
  min_price: "",
  max_price: "",
  no_of_owners_min: "1",
  no_of_owners_max: "",
  km_min: "10000",
  km_max: "",
  make_year_min: "",
  make_year_max: "",
  city_id: "",
};