// app/admin/portal/category/list/[categoryId]/sub-category/create/page.tsx

import Box from "@mui/material/Box";
import { SubCategoryForm } from "../_components/sub-categoryform";

type Props = {
  params: Promise<{ categoryId: string }>;
};

export default async function CategorySubCategoryCreatePage({ params }: Props) {
  const { categoryId } = await params;
  return (
    <Box sx={{ p: 2 }}>
      <SubCategoryForm mode="create" categoryIdFromRoute={categoryId} />
    </Box>
  );
}
