import { routes } from "@/lib/routes";
import { redirectToList } from "@/lib/navigation/redirectToList";

export default function IncomeExpensePage() {
  redirectToList(routes.incomeExpense.list());
}
