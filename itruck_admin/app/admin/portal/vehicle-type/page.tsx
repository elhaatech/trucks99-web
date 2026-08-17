import { routes } from "@/lib/routes";
import { redirectToList } from "@/lib/navigation/redirectToList";

export default function VehicleTypePage() {
  redirectToList(routes.vehicleType.list());
}
