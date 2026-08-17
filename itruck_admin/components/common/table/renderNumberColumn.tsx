// helpers/renderNumberColumn.ts

export function renderNumberColumn<T>(
  row: T,
  number: string | null | undefined,
  viewUrl: string,
  renderClickableName: (label: string, url: string) => React.ReactNode
): React.ReactNode {
  const formatted = number ?? "—";
  return renderClickableName(formatted, viewUrl);
}