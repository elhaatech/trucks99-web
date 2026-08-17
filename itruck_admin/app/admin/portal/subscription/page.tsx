import { routes } from "@/lib/routes";
import { redirectToList } from "@/lib/navigation/redirectToList";

export default function SubscriptionPage() {
  redirectToList(routes.subscription.list());
}
