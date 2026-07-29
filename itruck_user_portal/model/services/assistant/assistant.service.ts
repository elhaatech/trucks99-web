import { axiosClient } from "@/model/services/axiosClient";
import {
  sellBuySellProduct,
  deleteBuySellProducts,
  updateBuySellProductStatus,
  markBuySellProductSold,
  type BuySellCreatePayload,
  type BuySellProduct,
  type BuySellProductStatus,
} from "@/model/services/buysellapi";
import type { AssistantAction } from "@/types/assistant";
import type { ModuleFlow } from "@/types/moduleFlow";

export async function getAssistantSuggestions(): Promise<string[]> {
  try {
    const res = await axiosClient.get<{ suggestions: string[] }>(
      "/api/assistant/suggestions",
    );
    return res.data.suggestions ?? [];
  } catch {
    return [
      "How do I post a vehicle?",
      "How do I buy a vehicle?",
      "How do I make an offer?",
      "How do Featured Vehicles work?",
      "How do Favorites work?",
      "How do I chat with the seller?",
      "I want to sell my truck",
      "How many vehicles do I have?",
    ];
  }
}

/** Module how-to flows from the centralized knowledge base (not hardcoded in UI). */
export async function getAssistantFlows(): Promise<ModuleFlow[]> {
  try {
    const res = await axiosClient.get<{ flows: ModuleFlow[] }>(
      "/api/assistant/flows",
    );
    return res.data.flows ?? [];
  } catch {
    return [];
  }
}

/**
 * Execute structured assistant actions via existing marketplace APIs.
 * Does not invent new business endpoints.
 */
export async function executeAssistantAction(
  action: AssistantAction,
): Promise<{ message: string; product?: BuySellProduct; href?: string }> {
  const type = String(action.type || "").toLowerCase();
  const payload = (action.payload || {}) as Record<string, unknown>;

  if (type === "publish_listing" || type === "save_draft") {
    const raw = payload as unknown as BuySellCreatePayload;
    const body: BuySellCreatePayload = {
      ...raw,
      country_id: raw.country_id || "",
      state_id: raw.state_id || "",
      city_id: raw.city_id || "",
      images: Array.isArray(raw.images) ? raw.images : [],
      specifications: Array.isArray(raw.specifications) ? raw.specifications : [],
      status: type === "save_draft" ? "draft" : raw.status || "active",
    };
    // Avoid casting empty strings to ObjectId on the server
    const cleaned = {
      ...body,
      ...(body.country_id ? {} : { country_id: undefined }),
      ...(body.state_id ? {} : { state_id: undefined }),
      ...(body.city_id ? {} : { city_id: undefined }),
    } as BuySellCreatePayload;
    const result = await sellBuySellProduct(cleaned);
    return {
      message:
        type === "save_draft"
          ? result.message || "Draft saved."
          : result.message || "Listing published.",
      product: result.product,
    };
  }

  if (type === "delete_listing") {
    const id = String(payload.id || payload.productId || "");
    if (!id) throw new Error("Listing id required");
    await deleteBuySellProducts([id]);
    return { message: "Listing deleted." };
  }

  if (type === "mark_sold") {
    const id = String(payload.id || payload.productId || "");
    if (!id) throw new Error("Listing id required");
    await markBuySellProductSold(id);
    return { message: "Marked as sold." };
  }

  if (type === "update_status") {
    const id = String(payload.id || payload.productId || "");
    const status = String(payload.status || "");
    if (!id || !status) throw new Error("id and status required");
    await updateBuySellProductStatus(id, status as BuySellProductStatus);
    return { message: `Status updated to ${status}.` };
  }

  if (type === "navigate") {
    return {
      message: "Opening…",
      href: String(payload.href || "/dashboard"),
    };
  }

  throw new Error(`Unsupported action: ${action.type}`);
}
