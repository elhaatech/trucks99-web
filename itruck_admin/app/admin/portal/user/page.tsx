import { routes } from "@/lib/routes";
import { redirectToList } from "@/lib/navigation/redirectToList";

export default function UserPage() {
  redirectToList(routes.user.list());
}
