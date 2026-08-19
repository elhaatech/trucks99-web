import { routes } from "@/lib/routes";
import { redirectToList } from "@/lib/navigation/redirectToList";

export default function FavoritesPage() {
  redirectToList(routes.favorites.list());
}
