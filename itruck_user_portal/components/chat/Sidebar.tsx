"use client";

import { useState } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import InputAdornment from "@mui/material/InputAdornment";
import List from "@mui/material/List";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemText from "@mui/material/ListItemText";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import Tooltip from "@mui/material/Tooltip";
import CircularProgress from "@mui/material/CircularProgress";
import AddCommentRoundedIcon from "@mui/icons-material/AddCommentRounded";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import DriveFileRenameOutlineRoundedIcon from "@mui/icons-material/DriveFileRenameOutlineRounded";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import type { AssistantSession } from "@/types/assistant";
import { NEUTRAL, PRIMARY } from "@/lib/theme";

type Props = {
  sessions: AssistantSession[];
  activeSessionId: string | null;
  loading?: boolean;
  search: string;
  onSearchChange: (value: string) => void;
  onSelect: (id: string) => void;
  onNewChat: () => void;
  onRename: (id: string, title: string) => Promise<void> | void;
  onDelete: (id: string) => Promise<void> | void;
};

export function Sidebar({
  sessions,
  activeSessionId,
  loading,
  search,
  onSearchChange,
  onSelect,
  onNewChat,
  onRename,
  onDelete,
}: Props) {
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");

  return (
    <Box
      sx={{
        width: { xs: "100%", md: 300 },
        flexShrink: 0,
        height: "100%",
        display: "flex",
        flexDirection: "column",
        borderRight: { md: `1px solid ${NEUTRAL[200]}` },
        bgcolor: NEUTRAL[50],
      }}
    >
      <Box sx={{ p: 1.5, display: "flex", flexDirection: "column", gap: 1.25 }}>
        <Button
          fullWidth
          variant="contained"
          startIcon={<AddCommentRoundedIcon />}
          onClick={onNewChat}
          sx={{
            textTransform: "none",
            borderRadius: 2,
            bgcolor: PRIMARY,
            boxShadow: "none",
            fontWeight: 600,
            "&:hover": { bgcolor: "#1D4ED8", boxShadow: "none" },
          }}
        >
          New chat
        </Button>
        <TextField
          size="small"
          placeholder="Search chats"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchRoundedIcon fontSize="small" sx={{ color: NEUTRAL[400] }} />
              </InputAdornment>
            ),
          }}
          sx={{
            "& .MuiOutlinedInput-root": {
              borderRadius: 2,
              bgcolor: "#fff",
            },
          }}
        />
      </Box>

      <Typography
        variant="caption"
        sx={{ px: 2, color: NEUTRAL[500], fontWeight: 600, letterSpacing: 0.4 }}
      >
        RECENT CHATS
      </Typography>

      <Box sx={{ flex: 1, overflowY: "auto", mt: 0.5 }}>
        {loading ? (
          <Box sx={{ display: "grid", placeItems: "center", py: 4 }}>
            <CircularProgress size={22} />
          </Box>
        ) : sessions.length === 0 ? (
          <Typography variant="body2" sx={{ px: 2, py: 2, color: NEUTRAL[500] }}>
            No chats yet. Start a new conversation.
          </Typography>
        ) : (
          <List dense disablePadding>
            {sessions.map((session) => {
              const active = session._id === activeSessionId;
              const renaming = renamingId === session._id;
              return (
                <ListItemButton
                  key={session._id}
                  selected={active}
                  onClick={() => onSelect(session._id)}
                  sx={{
                    mx: 1,
                    mb: 0.5,
                    borderRadius: 2,
                    alignItems: "flex-start",
                    "&.Mui-selected": {
                      bgcolor: "rgba(37,99,235,0.1)",
                      "&:hover": { bgcolor: "rgba(37,99,235,0.14)" },
                    },
                  }}
                >
                  <ListItemText
                    primary={
                      renaming ? (
                        <TextField
                          size="small"
                          autoFocus
                          fullWidth
                          value={renameValue}
                          onClick={(e) => e.stopPropagation()}
                          onChange={(e) => setRenameValue(e.target.value)}
                          onBlur={() => {
                            void onRename(session._id, renameValue);
                            setRenamingId(null);
                          }}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              void onRename(session._id, renameValue);
                              setRenamingId(null);
                            }
                          }}
                        />
                      ) : (
                        session.title || "New chat"
                      )
                    }
                    secondary={session.lastMessage?.slice(0, 60)}
                    primaryTypographyProps={{
                      noWrap: true,
                      fontWeight: active ? 700 : 500,
                      fontSize: 14,
                    }}
                    secondaryTypographyProps={{
                      noWrap: true,
                      fontSize: 12,
                    }}
                  />
                  {!renaming && (
                    <Box sx={{ display: "flex", ml: 0.5 }} onClick={(e) => e.stopPropagation()}>
                      <Tooltip title="Rename">
                        <IconButton
                          size="small"
                          onClick={() => {
                            setRenamingId(session._id);
                            setRenameValue(session.title || "");
                          }}
                        >
                          <DriveFileRenameOutlineRoundedIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Delete">
                        <IconButton
                          size="small"
                          onClick={() => void onDelete(session._id)}
                        >
                          <DeleteOutlineRoundedIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  )}
                </ListItemButton>
              );
            })}
          </List>
        )}
      </Box>
    </Box>
  );
}
