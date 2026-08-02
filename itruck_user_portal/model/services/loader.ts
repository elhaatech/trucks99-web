import { api } from "./common_fixed";

// ——— Loader (for Load form dropdowns) ———
export type Loader = {
  _id: string;
  id?: string; // uuid when available
  name: string;
  description?: string;
  contactEmail?: string;
  contactMobile?: string;
  company?: string;
  status?: string;
};

export async function getLoaderAll(): Promise<Loader[]> {
  return api<Loader[]>("/api/loader/all");
}

