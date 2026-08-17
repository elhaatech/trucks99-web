import { routes } from "@/lib/routes";
import { redirectToList } from "@/lib/navigation/redirectToList";

export default function VehicleBodyTypePage() {
  redirectToList(routes.vehicleBodyType.list());
}
