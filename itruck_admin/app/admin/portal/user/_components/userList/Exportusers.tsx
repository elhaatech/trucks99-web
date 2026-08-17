import type { User } from "@/model/api";
import { getRowId } from "@/model/api";

/** Convert a User array to CSV text */
function usersToCSV(users: User[]): string {
  const headers = [
    "Name",
    "Mobile",
    "Company",
    "Role",
    "City",
    "State",
    "Country",
    "Status",
    "Date of Joining",
  ];

  const escape = (val: unknown): string => {
    const s = val == null ? "" : String(val);
    // Wrap in quotes if contains comma, quote, or newline
    if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
    return s;
  };

  const rows = users.map((u) => {
    const role = u.role as { name?: string } | string | undefined;

    const roleName =
      typeof role === "string"
        ? role
        : (role?.name ?? (u as any)?.roleId?.name ?? "");

    const createdAt =
      (u as any).createdAt ||
      (u as any)?.role?.createdAt ||
      (u as any)?.roleId?.createdAt;

    const doj = createdAt
      ? `'${new Date(createdAt).toISOString().split("T")[0]}`
      : "";
    return [
      u.name ?? "",
      u.mobile ?? "",
      (u as any).company_name ?? "",
      roleName,
      (u as any).city ?? "",
      (u as any).state ?? "",
      (u as any).country ?? "",
      (u as any).status ?? "",
      doj,
    ]
      .map(escape)
      .join(",");
  });

  return [headers.map(escape).join(","), ...rows].join("\r\n");
}

/** Trigger a browser download of the CSV */
export function exportUsersToCSV(users: User[], filename = "users.csv"): void {
  const csv = usersToCSV(users);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.style.display = "none";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
