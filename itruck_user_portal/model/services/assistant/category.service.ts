/**
 * Category helpers for the assistant — reuses existing category services.
 */
export {
  getCategories,
  getCategory,
  getCategoryRowId,
  getCategoryUuid,
  type Category,
} from "@/model/services/category";

export {
  getSubCategories,
  getSubCategoryRowId,
  type SubCategory,
} from "@/model/services/sub-category";

export {
  getSpecifications,
  getSpecificationValues,
  type Specification,
  type SpecificationValue,
} from "@/model/services/specification";
