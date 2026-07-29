"use client";

import { useCallback, useEffect, useState } from "react";
import Box from "@mui/material/Box";
import Drawer from "@mui/material/Drawer";
import IconButton from "@mui/material/IconButton";
import useMediaQuery from "@mui/material/useMediaQuery";
import { useTheme } from "@mui/material/styles";
import MenuRoundedIcon from "@mui/icons-material/MenuRounded";
import { Sidebar } from "./Sidebar";
import { ChatWindow } from "./ChatWindow";
import { useChat } from "@/hooks/useChat";
import { useAssistant } from "@/hooks/useAssistant";
import { NEUTRAL } from "@/lib/theme";
import type { AssistantAction } from "@/types/assistant";

export function ChatLayout() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const [mobileOpen, setMobileOpen] = useState(false);

  const chat = useChat();
  const assistant = useAssistant();

  useEffect(() => {
    if (!chat.activeSessionId && !chat.loadingSessions && chat.sessions.length === 0) {
      // leave empty until user starts — EmptyState handles UX
    }
  }, [chat.activeSessionId, chat.loadingSessions, chat.sessions.length]);

  useEffect(() => {
    const kickoff =
      typeof window !== "undefined"
        ? window.sessionStorage.getItem("assistant_kickoff_q")
        : null;
    if (!kickoff || chat.sending || chat.loadingSessions) return;
    window.sessionStorage.removeItem("assistant_kickoff_q");
    void (async () => {
      const msg = await chat.send(kickoff);
      await assistant.handleAssistantMessageActions(msg);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run once on mount kickoff
  }, [chat.loadingSessions]);

  const onSend = useCallback(
    async (value: string) => {
      const msg = await chat.send(value);
      await assistant.handleAssistantMessageActions(msg);
    },
    [chat, assistant],
  );

  const onAction = useCallback(
    (action: AssistantAction) => {
      void assistant.runAction(action);
    },
    [assistant],
  );

  const sidebar = (
    <Sidebar
      sessions={chat.sessions}
      activeSessionId={chat.activeSessionId}
      loading={chat.loadingSessions}
      search={chat.search}
      onSearchChange={chat.onSearchChange}
      onSelect={(id) => {
        void chat.openSession(id);
        setMobileOpen(false);
      }}
      onNewChat={() => {
        void chat.startNewChat();
        setMobileOpen(false);
      }}
      onRename={chat.rename}
      onDelete={chat.remove}
    />
  );

  return (
    <Box
      sx={{
        height: { xs: "calc(100vh - 120px)", md: "calc(100vh - 140px)" },
        minHeight: 520,
        display: "flex",
        border: `1px solid ${NEUTRAL[200]}`,
        borderRadius: 3,
        overflow: "hidden",
        bgcolor: "#fff",
        boxShadow: "0 10px 40px rgba(15,23,42,0.06)",
        position: "relative",
      }}
    >
      {isMobile ? (
        <>
          <IconButton
            onClick={() => setMobileOpen(true)}
            sx={{
              position: "absolute",
              top: 10,
              left: 10,
              zIndex: 2,
              bgcolor: "#fff",
              border: `1px solid ${NEUTRAL[200]}`,
            }}
            aria-label="Open chats"
          >
            <MenuRoundedIcon />
          </IconButton>
          <Drawer
            open={mobileOpen}
            onClose={() => setMobileOpen(false)}
            ModalProps={{ keepMounted: true }}
            sx={{
              "& .MuiDrawer-paper": { width: 300 },
            }}
          >
            {sidebar}
          </Drawer>
        </>
      ) : (
        sidebar
      )}

      <ChatWindow
        messages={chat.messages}
        loading={chat.loadingMessages}
        sending={chat.sending || assistant.actionLoading}
        error={chat.error}
        suggestions={assistant.suggestions}
        flows={assistant.flows}
        onSend={onSend}
        onAction={onAction}
        showEmpty={!chat.activeSessionId && chat.messages.length === 0}
      />
    </Box>
  );
}
