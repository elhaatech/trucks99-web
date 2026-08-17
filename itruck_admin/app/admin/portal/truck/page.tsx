import { routes } from "@/lib/routes";
import { redirectToList } from "@/lib/navigation/redirectToList";

export default function TruckPage() {
  redirectToList(routes.truck.list());
}
