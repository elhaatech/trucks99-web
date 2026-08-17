import { routes } from "@/lib/routes";
import { redirectToList } from "@/lib/navigation/redirectToList";

export default function CompanyStartCountryPage() {
  redirectToList(routes.companyStartCountry.list());
}
