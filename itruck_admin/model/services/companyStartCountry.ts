import { api } from "./common";
import type { ApiUser } from "./user";

export type CompanyStartCountry = {
  uuid: string | undefined;
  _id?: string;
  id?: string;
  city?: string;
  state?: string;
  country?: string;
  status?: string;
  createdAt?: string;
  updatedAt?: string;
};

export async function getCompanyStartCountryAll(): Promise<CompanyStartCountry[]> {
  return api<CompanyStartCountry[]>("/api/company-start-country/all");
}

export async function getCompanyStartCountry(id: string): Promise<CompanyStartCountry> {
  return api<CompanyStartCountry>(`/api/company-start-country/${id}`);
}

export async function createCompanyStartCountry(body: {
  city: string;
  state: string;
  country: string;
  user?: ApiUser;
}) {
  return api<{ message: string; companyStartCountry: CompanyStartCountry }>("/api/company-start-country/add", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function updateCompanyStartCountry(
  id: string,
  body: {
    city?: string;
    state?: string;
    country?: string;
    user?: ApiUser;
  }
) {
  return api<{ message: string; companyStartCountry: CompanyStartCountry }>(`/api/company-start-country/edit/${id}`, {
    method: "PUT",
    body: JSON.stringify(body),
  });
}

export async function deleteCompanyStartCountry(ids: string[]) {
  return api<{ message: string; deletedCount: number; ids: string[] }>("/api/company-start-country/delete", {
    method: "DELETE",
    body: JSON.stringify({ ids }),
  });
}

