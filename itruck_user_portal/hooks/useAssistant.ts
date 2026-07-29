"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  executeAssistantAction,
  getAssistantSuggestions,
  getAssistantFlows,
} from "@/model/services/assistant/assistant.service";
import { userProductRoutes } from "@/lib/userProductRoutes";
import { useNotification } from "@/hooks/useNotification";
import type { AssistantAction, AssistantMessage } from "@/types/assistant";
import type { ModuleFlow } from "@/types/moduleFlow";
import { getBuySellRowId } from "@/model/services/buysellapi";

/**
 * Handles assistant smart actions (publish, draft, navigate, etc.)
 * using existing marketplace APIs.
 */
export function useAssistant() {
  const router = useRouter();
  const { notify } = useNotification();
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [flows, setFlows] = useState<ModuleFlow[]>([]);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    void getAssistantSuggestions().then(setSuggestions).catch(() => {});
    void getAssistantFlows().then(setFlows).catch(() => {});
  }, []);

  const runAction = useCallback(
    async (action: AssistantAction) => {
      setActionLoading(true);
      try {
        const result = await executeAssistantAction(action);
        if (result.href) {
          router.push(result.href);
          return result;
        }
        notify({
          type: "success",
          message: result.message,
        });
        if (result.product) {
          const id = getBuySellRowId(result.product);
          if (id) {
            router.push(userProductRoutes.view(id));
          }
        }
        return result;
      } catch (e) {
        notify({
          type: "error",
          message: e instanceof Error ? e.message : "Action failed",
        });
        return null;
      } finally {
        setActionLoading(false);
      }
    },
    [notify, router],
  );

  /** Auto-run publish/draft actions returned from the assistant turn */
  const handleAssistantMessageActions = useCallback(
    async (message: AssistantMessage | null | undefined) => {
      const actions = message?.meta?.actions;
      if (!actions?.length) return;
      const auto = actions.find((a) =>
        ["publish_listing", "save_draft"].includes(String(a.type)),
      );
      // Only auto-run when the message content indicates an in-progress publish
      if (
        auto &&
        /publishing|saving as draft/i.test(message?.content || "")
      ) {
        await runAction(auto);
      }
    },
    [runAction],
  );

  return {
    suggestions,
    flows,
    actionLoading,
    runAction,
    handleAssistantMessageActions,
  };
}
