import { routes } from "@/lib/routes";
import { redirectToList } from "@/lib/navigation/redirectToList";

export default function EnquiryPage() {
  redirectToList(routes.enquiry.list());
}
