import { routes } from "@/lib/routes";
import { redirectToList } from "@/lib/navigation/redirectToList";

export default function CategoriesPageRoute() {
  redirectToList(routes.category.list());
}
