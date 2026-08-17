import { routes } from "@/lib/routes";
import { redirectToList } from "@/lib/navigation/redirectToList";

type Props = {
  params: Promise<{ categoryId: string }>;
};

export default async function SubCategoryIndexPage({ params }: Props) {
  const { categoryId } = await params;
  redirectToList(routes.subCategory.list(categoryId));
}
