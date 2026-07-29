import type { ProductBitRecord } from "@/model/services/bitRecord";
import type { BuySellProduct } from "@/model/services/buysellapi";
import {
  getBuyerDisplayName,
  getBuyerMobile,
  getProductTitle,
  getSellerDisplayName,
  getSellerMobile,
} from "../utils";
import type { OfferRow } from "../OfferTable";

export type ProductOfferVehicleContext = {
  productId: string;
  title: string;
  imageUrl?: string;
  listedPrice?: number;
  sellerName?: string;
  sellerMobile?: string | null;
};

export function formatOfferDate(iso?: string): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function offerStatusLabel(status?: string): string {
  switch ((status ?? "").toLowerCase()) {
    case "accept":
    case "accepted":
      return "Accepted";
    case "reject":
    case "rejected":
      return "Rejected";
    case "pending":
    default:
      return "Pending";
  }
}

export function offerStatusTextColor(status?: string): string {
  switch ((status ?? "").toLowerCase()) {
    case "accept":
    case "accepted":
      return "#16a34a";
    case "reject":
    case "rejected":
      return "#dc2626";
    case "pending":
    default:
      return "#ea580c";
  }
}

export function isOfferPending(status?: string): boolean {
  const s = (status ?? "").toLowerCase();
  return s === "pending" || s === "";
}

export function toProductViewOfferRow(
  record: ProductBitRecord,
  mode: "my" | "received",
  vehicle: ProductOfferVehicleContext,
): OfferRow {
  const productInfo = (record.product_info ?? null) as BuySellProduct | null;
  const listedPrice =
    vehicle.listedPrice ?? productInfo?.price ?? record.product_info?.price;

  const syntheticProduct = {
    ...(productInfo ?? {}),
    _id: vehicle.productId,
    id: vehicle.productId,
    description: vehicle.title,
    price: listedPrice,
    images: vehicle.imageUrl
      ? [vehicle.imageUrl]
      : productInfo?.images ?? [],
    created_by: vehicle.sellerName ?? productInfo?.created_by,
  } as BuySellProduct;

  const sellerLabel =
    vehicle.sellerName ||
    (productInfo ? getSellerDisplayName(productInfo) : null) ||
    "Seller";
  const buyerLabel = getBuyerDisplayName({
    buyer_name: (record as { buyer_name?: string }).buyer_name,
    userName: record.userName,
  });
  const sellerMobile =
    vehicle.sellerMobile ||
    (productInfo ? getSellerMobile(productInfo) : null);
  const buyerMobile = getBuyerMobile({
    buyer_mobile: (record as { buyer_mobile?: string | null }).buyer_mobile,
    userEmail: record.userEmail,
  });

  return {
    ...record,
    productId: vehicle.productId,
    product: syntheticProduct,
    productTitle:
      vehicle.title ||
      (productInfo ? getProductTitle(productInfo) : undefined) ||
      productInfo?.description ||
      "Vehicle",
    counterpartyName: mode === "my" ? sellerLabel : buyerLabel,
    counterpartyMobile: mode === "my" ? sellerMobile : buyerMobile,
  };
}
