import { api } from "./common";
import type { ApiUser } from "./user";
import type { IncomeExpenseCategory } from "./incomeExpenseCategory";

/** Single income or expense entry (shared by list, get, create, update responses). */
export type IncomeExpense = {
  _id: string;
  id?: string;
  type: "income" | "expense";
  category_id: string;
  category?: IncomeExpenseCategory;
  remarks?: string;
  amount: number;
  status?: "active" | "inactive";
  createdAt?: string;
  updatedAt?: string;
};

/** GET /all — list of income/expense entries. */
export type IncomeExpenseListResponse = IncomeExpense[];

/** GET /:id — single entry. */
export type IncomeExpenseSingleResponse = IncomeExpense;

/** POST /add and PUT /edit/:id — shared response shape. */
export type IncomeExpenseMutationResponse = {
  message: string;
  incomeExpense: IncomeExpense;
};

/** DELETE /delete — response shape. */
export type IncomeExpenseDeleteResponse = {
  message: string;
  deletedCount: number;
  ids: string[];
};

export async function getIncomeExpenseAll(): Promise<IncomeExpenseListResponse> {
  return api<IncomeExpenseListResponse>("/api/income-expense/all");
}

export async function getIncomeExpense(id: string): Promise<IncomeExpenseSingleResponse> {
  return api<IncomeExpenseSingleResponse>(`/api/income-expense/${id}`);
}

export async function createIncomeExpense(body: {
  type: "income" | "expense";
  category_id: string;
  remarks?: string;
  amount: number;
  user?: ApiUser;
}): Promise<IncomeExpenseMutationResponse> {
  return api<IncomeExpenseMutationResponse>("/api/income-expense/add", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function updateIncomeExpense(
  id: string,
  body: {
    type: "income" | "expense";
    category_id: string;
    remarks?: string;
    amount: number;
    user?: ApiUser;
  }
): Promise<IncomeExpenseMutationResponse> {
  return api<IncomeExpenseMutationResponse>(`/api/income-expense/edit/${id}`, {
    method: "PUT",
    body: JSON.stringify(body),
  });
}

export async function deleteIncomeExpense(ids: string[]): Promise<IncomeExpenseDeleteResponse> {
  return api<IncomeExpenseDeleteResponse>("/api/income-expense/delete", {
    method: "DELETE",
    body: JSON.stringify({ ids }),
  });
}
