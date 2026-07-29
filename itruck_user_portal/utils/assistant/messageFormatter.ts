/** Lightweight markdown → React-friendly blocks for chat bubbles */

export type FormattedBlock =
  | { type: "paragraph"; text: string }
  | { type: "heading"; text: string; level: number }
  | { type: "list"; ordered: boolean; items: string[] }
  | { type: "code"; text: string }
  | { type: "table"; headers: string[]; rows: string[][] };

function stripInline(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .trim();
}

export function parseAssistantMarkdown(content: string): FormattedBlock[] {
  const lines = String(content || "").split(/\r?\n/);
  const blocks: FormattedBlock[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (line.startsWith("```")) {
      const buf: string[] = [];
      i += 1;
      while (i < lines.length && !lines[i].startsWith("```")) {
        buf.push(lines[i]);
        i += 1;
      }
      blocks.push({ type: "code", text: buf.join("\n") });
      i += 1;
      continue;
    }

    if (line.trim().startsWith("|") && line.includes("|")) {
      const tableLines: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith("|")) {
        tableLines.push(lines[i]);
        i += 1;
      }
      const parsed = tableLines
        .filter((l) => !/^\|\s*-+/.test(l.trim()))
        .map((l) =>
          l
            .split("|")
            .slice(1, -1)
            .map((c) => stripInline(c)),
        );
      if (parsed.length) {
        blocks.push({
          type: "table",
          headers: parsed[0],
          rows: parsed.slice(1),
        });
      }
      continue;
    }

    if (/^#{1,3}\s/.test(line)) {
      const level = line.match(/^#+/)?.[0].length || 1;
      blocks.push({
        type: "heading",
        level,
        text: stripInline(line.replace(/^#+\s*/, "")),
      });
      i += 1;
      continue;
    }

    if (/^\s*[-•*]\s+/.test(line) || /^\s*\d+\.\s+/.test(line)) {
      const ordered = /^\s*\d+\.\s+/.test(line);
      const items: string[] = [];
      while (
        i < lines.length &&
        (/^\s*[-•*]\s+/.test(lines[i]) || /^\s*\d+\.\s+/.test(lines[i]))
      ) {
        items.push(
          stripInline(lines[i].replace(/^\s*([-•*]|\d+\.)\s+/, "")),
        );
        i += 1;
      }
      blocks.push({ type: "list", ordered, items });
      continue;
    }

    if (!line.trim()) {
      i += 1;
      continue;
    }

    const buf: string[] = [line];
    i += 1;
    while (
      i < lines.length &&
      lines[i].trim() &&
      !lines[i].startsWith("```") &&
      !lines[i].trim().startsWith("|") &&
      !/^#{1,3}\s/.test(lines[i]) &&
      !/^\s*[-•*]\s+/.test(lines[i]) &&
      !/^\s*\d+\.\s+/.test(lines[i])
    ) {
      buf.push(lines[i]);
      i += 1;
    }
    blocks.push({ type: "paragraph", text: buf.join(" ") });
  }

  return blocks;
}

/** Keep bold markers for UI renderer */
export function splitBoldSegments(
  text: string,
): Array<{ bold: boolean; text: string }> {
  const parts = String(text || "").split(/(\*\*[^*]+\*\*|`[^`]+`)/g);
  return parts.filter(Boolean).map((part) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return { bold: true, text: part.slice(2, -2) };
    }
    if (part.startsWith("`") && part.endsWith("`")) {
      return { bold: false, text: part.slice(1, -1) };
    }
    return { bold: false, text: part };
  });
}
