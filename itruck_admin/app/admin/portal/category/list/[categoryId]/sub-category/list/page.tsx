// app/admin/portal/category/list/[categoryId]/sub-category/list/page.tsx

import { SubCategoriesPage } from "../_components/SubCategoriesPage";

type Props = {
  params: Promise<{ categoryId: string }>;
};

export default async function CategorySubCategoryListPage({ params }: Props) {
  const { categoryId } = await params;
  return <SubCategoriesPage categoryId={categoryId} />;
}
