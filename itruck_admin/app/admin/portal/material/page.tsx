import { routes } from "@/lib/routes";
import { redirectToList } from "@/lib/navigation/redirectToList";

export default function MaterialPage() {
  redirectToList(routes.material.list());
}
