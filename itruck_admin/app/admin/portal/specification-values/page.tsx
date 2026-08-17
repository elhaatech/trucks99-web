import { routes } from "@/lib/routes";
import { redirectToList } from "@/lib/navigation/redirectToList";

export default function SpecificationValuesRootPage() {
  redirectToList(routes.specificationValue.list());
}
