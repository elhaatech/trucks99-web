import { routes } from "@/lib/routes";
import { redirectToList } from "@/lib/navigation/redirectToList";

export default function IncomeExpenseCategoryPage() {
  redirectToList(routes.incomeExpenseCategory.list());
}
