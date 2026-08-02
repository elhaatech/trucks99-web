import { api } from "./common_fixed";
import type { ApiUser } from "./user";

export type IncomeExpenseCategory = {
  _id: string;
  id?: string;
  type: "income" | "expense";
  categoryName: string;
  status: "Active" | "Inactive";
  createdAt?: string;
  updatedAt?: string;
};

export async function getIncomeExpenseCategoryAll(): Promise<IncomeExpenseCategory[]> {
  return api<IncomeExpenseCategory[]>("/api/income-expense-category/all");
}

export async function getIncomeExpenseCategory(id: string) {
  return api<IncomeExpenseCategory>(`/api/income-expense-category/${id}`);
}

export async function createIncomeExpenseCategory(body: {
  type: "income" | "expense";
  categoryName: string;
  status?: "Active" | "Inactive";
  user?: ApiUser;
}) {
  return api<{ message: string; category: IncomeExpenseCategory }>("/api/income-expense-category/add", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function updateIncomeExpenseCategory(
  id: string,
  body: {
    type: "income" | "expense";
    categoryName: string;
    status?: "Active" | "Inactive";
    user?: ApiUser;
  }
) {
  return api<{ message: string; category: IncomeExpenseCategory }>(`/api/income-expense-category/edit/${id}`, {
    method: "PUT",
    body: JSON.stringify(body),
  });
}

export async function deleteIncomeExpenseCategory(ids: string[]) {
  return api<{ message: string; deletedCount: number; ids: string[] }>("/api/income-expense-category/delete", {
    method: "DELETE",
    body: JSON.stringify({ ids }),
  });
}
