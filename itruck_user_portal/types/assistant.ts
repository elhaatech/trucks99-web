/** Shared AI Assistant types */

export type AssistantQuickReply = {
  label: string;
  value: string;
};

export type AssistantAction = {
  type: string;
  label: string;
  payload?: Record<string, unknown>;
};

export type AssistantMessageMeta = {
  quickReplies?: AssistantQuickReply[];
  actions?: AssistantAction[];
  data?: unknown;
  intent?: string | null;
};

export type AssistantMessage = {
  _id: string;
  id?: string;
  sessionId: string;
  role: "user" | "assistant" | "system";
  content: string;
  meta?: AssistantMessageMeta;
  createdAt?: string;
  updatedAt?: string;
};

export type AssistantSession = {
  _id: string;
  id?: string;
  userId: string;
  title: string;
  context?: Record<string, unknown>;
  lastMessage?: string;
  lastMessageAt?: string | null;
  messageCount?: number;
  status?: "active" | "archived";
  createdAt?: string;
  updatedAt?: string;
};

export type BuySellCreatePayload = {
  category_id: string;
  subcategory_id: string;
  price: number | string;
  description: string;
  images: string[];
  specifications: Array<{ specification_id: string; specification_value: string }>;
  country_id: string;
  state_id: string;
  city_id: string;
  address: string;
  pincode: string;
  status?: string;
};

export type SendMessageResponse = {
  session: AssistantSession;
  userMessage: { role: "user"; content: string };
  assistantMessage: AssistantMessage;
};
