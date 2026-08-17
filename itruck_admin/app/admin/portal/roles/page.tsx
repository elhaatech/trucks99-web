import { routes } from "@/lib/routes";
import { redirectToList } from "@/lib/navigation/redirectToList";

export default function RolesPage() {
  redirectToList(routes.role.list());
}
