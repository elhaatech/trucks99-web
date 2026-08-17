import { ROUTES } from "@/lib/routes";
import { redirectToList } from "@/lib/navigation/redirectToList";

export default function LoadPage() {
  redirectToList(ROUTES.load.list);
}
