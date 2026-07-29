import type { OfferRow } from "../OfferTable";
import { formatOfferDate, offerStatusLabel } from "./productOfferMappers";
import { formatProductPrice } from "../utils";

function escapeCsv(value: string): string {
  if (/[",\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

export function exportOffersToCsv(
  rows: OfferRow[],
  mode: "my" | "received",
  filename: string,
): void {
  const counterpartyHeader = mode === "my" ? "Seller" : "Buyer";
  const offerHeader = mode === "my" ? "My Offer" : "Offer Price";
  const listHeader = mode === "my" ? "Seller Price" : "My Price";

  const header = [
    "Vehicle",
    counterpartyHeader,
    offerHeader,
    listHeader,
    "Status",
    "Date",
  ];

  const lines = rows.map((row) => {
    const listed = row.product?.price;
    return [
      row.productTitle || "Vehicle",
      row.counterpartyName || row.userName || "—",
      row.bit != null ? formatProductPrice(row.bit) : "—",
      listed != null ? formatProductPrice(listed) : "—",
      offerStatusLabel(row.status),
      formatOfferDate(row.createdAt),
    ].map((c) => escapeCsv(String(c)));
  });

  const csv = [header.join(","), ...lines.map((l) => l.join(","))].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function exportOffersToPdf(
  rows: OfferRow[],
  mode: "my" | "received",
  title: string,
): void {
  const counterpartyHeader = mode === "my" ? "Seller" : "Buyer";
  const offerHeader = mode === "my" ? "My Offer" : "Offer Price";
  const listHeader = mode === "my" ? "Seller Price" : "My Price";

  const rowsHtml = rows
    .map(
      (row) => `
      <tr>
        <td>${row.productTitle || "Vehicle"}</td>
        <td>${row.counterpartyName || row.userName || "—"}</td>
        <td>${row.bit != null ? formatProductPrice(row.bit) : "—"}</td>
        <td>${row.product?.price != null ? formatProductPrice(row.product.price) : "—"}</td>
        <td>${offerStatusLabel(row.status)}</td>
        <td>${formatOfferDate(row.createdAt)}</td>
      </tr>`,
    )
    .join("");

  const html = `<!DOCTYPE html><html><head><title>${title}</title>
    <style>
      body { font-family: system-ui, sans-serif; padding: 24px; color: #0f172a; }
      h1 { font-size: 20px; margin-bottom: 16px; }
      table { width: 100%; border-collapse: collapse; font-size: 13px; }
      th, td { border: 1px solid #e2e8f0; padding: 10px 12px; text-align: left; }
      th { background: #f8fafc; font-weight: 700; }
    </style></head><body>
    <h1>${title}</h1>
    <table>
      <thead><tr>
        <th>Vehicle</th><th>${counterpartyHeader}</th><th>${offerHeader}</th>
        <th>${listHeader}</th><th>Status</th><th>Date</th>
      </tr></thead>
      <tbody>${rowsHtml}</tbody>
    </table>
    </body></html>`;

  const win = window.open("", "_blank");
  if (!win) return;
  win.document.write(html);
  win.document.close();
  win.focus();
  win.print();
}
