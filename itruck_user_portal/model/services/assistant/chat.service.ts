import { axiosClient } from "@/model/services/axiosClient";
import type {
  AssistantSession,
  AssistantMessage,
  SendMessageResponse,
} from "@/types/assistant";

function normalizeError(error: unknown): never {
  if (typeof error === "object" && error && "response" in error) {
    const e = error as { response?: { data?: { message?: string } } };
    throw new Error(e.response?.data?.message || "Request failed");
  }
  throw error instanceof Error ? error : new Error("Request failed");
}

export async function listChatSessions(search = ""): Promise<AssistantSession[]> {
  try {
    const res = await axiosClient.get<{ sessions: AssistantSession[] }>(
      "/api/assistant/sessions",
      { params: search ? { search } : undefined },
    );
    return res.data.sessions ?? [];
  } catch (error) {
    normalizeError(error);
  }
}

export async function createChatSession(title?: string): Promise<AssistantSession> {
  try {
    const res = await axiosClient.post<{ session: AssistantSession }>(
      "/api/assistant/sessions",
      title ? { title } : {},
    );
    return res.data.session;
  } catch (error) {
    normalizeError(error);
  }
}

export async function getChatSession(
  sessionId: string,
): Promise<{ session: AssistantSession; messages: AssistantMessage[] }> {
  try {
    const res = await axiosClient.get<{
      session: AssistantSession;
      messages: AssistantMessage[];
    }>(`/api/assistant/sessions/${encodeURIComponent(sessionId)}`);
    return res.data;
  } catch (error) {
    normalizeError(error);
  }
}

export async function renameChatSession(
  sessionId: string,
  title: string,
): Promise<AssistantSession> {
  try {
    const res = await axiosClient.patch<{ session: AssistantSession }>(
      `/api/assistant/sessions/${encodeURIComponent(sessionId)}`,
      { title },
    );
    return res.data.session;
  } catch (error) {
    normalizeError(error);
  }
}

export async function deleteChatSession(sessionId: string): Promise<void> {
  try {
    await axiosClient.delete(
      `/api/assistant/sessions/${encodeURIComponent(sessionId)}`,
    );
  } catch (error) {
    normalizeError(error);
  }
}

export async function sendChatMessage(
  sessionId: string,
  content: string,
): Promise<SendMessageResponse> {
  try {
    const res = await axiosClient.post<SendMessageResponse>(
      `/api/assistant/sessions/${encodeURIComponent(sessionId)}/messages`,
      { content },
    );
    return res.data;
  } catch (error) {
    normalizeError(error);
  }
}
