import { routes } from "@/lib/routes";
import { redirectToList } from "@/lib/navigation/redirectToList";

export default function BuySellIndexPage() {
  redirectToList(routes.buysell.list());
}
