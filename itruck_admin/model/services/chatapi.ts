import { axiosClient } from "./axiosClient";

export type ChatProductInfo = {
  _id: string;
  bsNumber: string | null;
  vehicleId?: string | null;
  title: string;
  price: number;
  image: string | null;
  images: string[];
  status: string;
};

export type ChatUserInfo = {
  _id: string;
  name: string;
  email: string;
  mobile: string;
};

export type ChatRoom = {
  id?: string;
  _id: string;
  roomId: string;
  productId: string;
  product: ChatProductInfo | null;
  sellerId: string;
  buyerId: string;
  seller: ChatUserInfo | null;
  buyer: ChatUserInfo | null;
  lastMessage: string;
  lastMessageAt: string | null;
  unreadCount: number;
  status: "active" | "closed";
  createdAt?: string;
  updatedAt?: string;
};

export type ChatMessage = {
  id?: string;
  _id: string;
  roomId: string;
  senderId: string;
  message: string;
  createdAt: string;
};

export const CHAT_CHANGED_EVENT = "itruck-chat-changed";

export function notifyChatChanged(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(CHAT_CHANGED_EVENT));
}

function normalizeError(error: unknown): never {
  if (typeof error === "object" && error && "response" in error) {
    const e = error as { response?: { data?: { message?: string } } };
    throw new Error(e.response?.data?.message || "Request failed");
  }
  throw error instanceof Error ? error : new Error("Request failed");
}

export async function createOrGetChatRoom(
  productId: string,
): Promise<{ message: string; room: ChatRoom }> {
  try {
    const res = await axiosClient.post<{ message: string; room: ChatRoom }>(
      "/api/chat/create",
      { productId },
    );
    return res.data;
  } catch (error) {
    normalizeError(error);
  }
}

export async function sendChatMessage(
  roomId: string,
  message: string,
): Promise<{ message: string; chatMessage: ChatMessage; room: ChatRoom }> {
  try {
    const res = await axiosClient.post<{
      message: string;
      chatMessage: ChatMessage;
      room: ChatRoom;
    }>("/api/chat/send", { roomId, message });
    return res.data;
  } catch (error) {
    normalizeError(error);
  }
}

export async function getChatMessages(
  roomId: string,
): Promise<{ room: ChatRoom; messages: ChatMessage[] }> {
  try {
    const res = await axiosClient.get<{ room: ChatRoom; messages: ChatMessage[] }>(
      `/api/chat/messages/${roomId}`,
    );
    return res.data;
  } catch (error) {
    normalizeError(error);
  }
}

export async function getChatList(): Promise<ChatRoom[]> {
  try {
    const res = await axiosClient.get<ChatRoom[]>("/api/chat/list");
    return res.data ?? [];
  } catch (error) {
    normalizeError(error);
  }
}