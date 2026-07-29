"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  createChatSession,
  deleteChatSession,
  getChatSession,
  listChatSessions,
  renameChatSession,
  sendChatMessage,
} from "@/model/services/assistant/chat.service";
import type { AssistantMessage, AssistantSession } from "@/types/assistant";

function debounce<T extends (...args: string[]) => void>(fn: T, ms: number) {
  let t: ReturnType<typeof setTimeout> | null = null;
  return (arg: string) => {
    if (t) clearTimeout(t);
    t = setTimeout(() => fn(arg), ms);
  };
}

export function useChat() {
  const [sessions, setSessions] = useState<AssistantSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<AssistantMessage[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const activeRef = useRef<string | null>(null);

  useEffect(() => {
    activeRef.current = activeSessionId;
  }, [activeSessionId]);

  const refreshSessions = useCallback(async (q = "") => {
    setLoadingSessions(true);
    setError(null);
    try {
      const list = await listChatSessions(q);
      setSessions(list);
      return list;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load chats");
      return [];
    } finally {
      setLoadingSessions(false);
    }
  }, []);

  const debouncedSearch = useMemo(
    () =>
      debounce((q: string) => {
        void refreshSessions(q);
      }, 300),
    [refreshSessions],
  );

  useEffect(() => {
    void refreshSessions();
  }, [refreshSessions]);

  const openSession = useCallback(async (sessionId: string) => {
    setActiveSessionId(sessionId);
    setLoadingMessages(true);
    setError(null);
    try {
      const data = await getChatSession(sessionId);
      if (activeRef.current === sessionId) {
        setMessages(data.messages);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load messages");
    } finally {
      setLoadingMessages(false);
    }
  }, []);

  const startNewChat = useCallback(async () => {
    setError(null);
    try {
      const session = await createChatSession();
      setSessions((prev) => [session, ...prev]);
      setActiveSessionId(session._id);
      const data = await getChatSession(session._id);
      setMessages(data.messages);
      return session;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create chat");
      return null;
    }
  }, []);

  const send = useCallback(
    async (content: string) => {
      const text = content.trim();
      if (!text || sending) return null;

      let sessionId = activeSessionId;
      if (!sessionId) {
        const created = await startNewChat();
        sessionId = created?._id ?? null;
      }
      if (!sessionId) return null;

      const optimisticId = `tmp-${Date.now()}`;
      const optimistic: AssistantMessage = {
        _id: optimisticId,
        sessionId,
        role: "user",
        content: text,
        createdAt: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, optimistic]);
      setSending(true);
      setError(null);

      try {
        const result = await sendChatMessage(sessionId, text);
        setMessages((prev) => {
          const withoutTmp = prev.filter((m) => m._id !== optimisticId);
          return [
            ...withoutTmp,
            {
              _id: `user-${Date.now()}`,
              sessionId,
              role: "user",
              content: text,
              createdAt: new Date().toISOString(),
            },
            result.assistantMessage,
          ];
        });
        setSessions((prev) => {
          const updated = prev.map((s) =>
            s._id === sessionId
              ? {
                  ...s,
                  ...result.session,
                  title: result.session.title || s.title,
                  lastMessage: result.session.lastMessage,
                  updatedAt: result.session.updatedAt,
                }
              : s,
          );
          return updated.sort(
            (a, b) =>
              new Date(b.updatedAt || 0).getTime() -
              new Date(a.updatedAt || 0).getTime(),
          );
        });
        return result.assistantMessage;
      } catch (e) {
        setMessages((prev) => prev.filter((m) => m._id !== optimisticId));
        setError(e instanceof Error ? e.message : "Failed to send");
        return null;
      } finally {
        setSending(false);
      }
    },
    [activeSessionId, sending, startNewChat],
  );

  const rename = useCallback(async (sessionId: string, title: string) => {
    const session = await renameChatSession(sessionId, title);
    setSessions((prev) =>
      prev.map((s) => (s._id === sessionId ? { ...s, ...session } : s)),
    );
  }, []);

  const remove = useCallback(
    async (sessionId: string) => {
      await deleteChatSession(sessionId);
      setSessions((prev) => prev.filter((s) => s._id !== sessionId));
      if (activeSessionId === sessionId) {
        setActiveSessionId(null);
        setMessages([]);
      }
    },
    [activeSessionId],
  );

  const onSearchChange = useCallback(
    (value: string) => {
      setSearch(value);
      debouncedSearch(value);
    },
    [debouncedSearch],
  );

  return {
    sessions,
    activeSessionId,
    messages,
    loadingSessions,
    loadingMessages,
    sending,
    error,
    search,
    setError,
    refreshSessions,
    openSession,
    startNewChat,
    send,
    rename,
    remove,
    onSearchChange,
  };
}
