import { api } from "./common_fixed";
import type { ApiUser } from "./user";

// ——— Agent ———
export type Agent = {
  _id: string;
  id?: string; // uuid when available
  name: string;
  description?: string;
  contactEmail?: string;
  contactMobile?: string;
  region?: string;
  status?: "active" | "inactive";
  createdAt?: string;
  updatedAt?: string;
};

export async function getAgentAll(): Promise<Agent[]> {
  return api<Agent[]>("/api/agent/all");
}

/** Agents linked to this user (createdBy). For Agent view. */
export async function getMyAgents(userId: string): Promise<Agent[]> {
  return api<Agent[]>(`/api/agent/my`, { params: { userId } });
}

export async function getAgent(id: string) {
  return api<Agent>(`/api/agent/${id}`);
}

export async function createAgent(body: Partial<Agent> & { name: string; user?: ApiUser }) {
  return api<{ message: string; agent: Agent }>("/api/agent/add", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function updateAgent(id: string, body: Partial<Agent> & { user?: ApiUser }) {
  return api<{ message: string; agent: Agent }>(`/api/agent/edit/${id}`, {
    method: "PUT",
    body: JSON.stringify(body),
  });
}

export async function deleteAgent(ids: string[]) {
  return api<{ message: string; deletedCount: number; ids: string[] }>("/api/agent/delete", {
    method: "DELETE",
    body: JSON.stringify({ ids }),
  });
}

