type PdfLine = {
  text: string;
  size?: number;
  bold?: boolean;
  color?: "navy" | "slate" | "gold" | "white";
  gapAfter?: number;
};

const PAGE_WIDTH = 612;
const PAGE_HEIGHT = 792;
const MARGIN_X = 54;
const TOP_Y = 726;
const BOTTOM_Y = 72;
const BODY_SIZE = 10.5;
const LINE_HEIGHT = 15;

function escapePdfText(value: string) {
  return String(value)
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)")
    .replace(/\r/g, "")
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/→/g, "->")
    .replace(/•/g, "-")
    .replace(/—/g, "-")
    .replace(/–/g, "-");
}

function colorCommand(color: PdfLine["color"]) {
  switch (color) {
    case "navy":
      return "0.04 0.18 0.30 rg";
    case "gold":
      return "0.86 0.49 0.08 rg";
    case "white":
      return "1 1 1 rg";
    case "slate":
    default:
      return "0.10 0.13 0.18 rg";
  }
}

function fontCommand(line: PdfLine) {
  return line.bold ? "/F2" : "/F1";
}

function estimateWidth(text: string, size: number) {
  return text.length * size * 0.48;
}

function wrapText(text: string, maxWidth: number, size: number) {
  const words = String(text).split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    const next = current ? `${current} ${word}` : word;

    if (estimateWidth(next, size) <= maxWidth) {
      current = next;
    } else {
      if (current) lines.push(current);
      current = word;
    }
  }

  if (current) lines.push(current);

  return lines.length ? lines : [""];
}

function normalizeMarkdownLine(line: string): PdfLine[] {
  const trimmed = line.trim();

  if (!trimmed) {
    return [{ text: "", gapAfter: 6 }];
  }

  if (trimmed.startsWith("# ")) {
    return [{ text: trimmed.replace(/^#\s+/, ""), size: 18, bold: true, color: "navy", gapAfter: 8 }];
  }

  if (trimmed.startsWith("## ")) {
    return [{ text: trimmed.replace(/^##\s+/, ""), size: 14, bold: true, color: "navy", gapAfter: 6 }];
  }

  if (/^\d+\.\s+/.test(trimmed)) {
    return [{ text: trimmed, size: 12, bold: true, color: "navy", gapAfter: 5 }];
  }

  if (trimmed.startsWith("- ")) {
    return [{ text: `• ${trimmed.replace(/^-\s+/, "")}`, size: BODY_SIZE, color: "slate", gapAfter: 4 }];
  }

  return [{ text: trimmed, size: BODY_SIZE, color: "slate", gapAfter: 6 }];
}

function contentLinesFromMarkdown(content: string) {
  const rawLines = String(content ?? "").split("\n");
  const lines: PdfLine[] = [];

  for (const rawLine of rawLines) {
    lines.push(...normalizeMarkdownLine(rawLine));
  }

  return lines;
}

function buildPageHeader({
  title,
  subtitle,
  pageNumber,
}: {
  title: string;
  subtitle: string;
  pageNumber: number;
}) {
  const commands: string[] = [];

  commands.push("0.04 0.18 0.30 rg");
  commands.push(`0 ${PAGE_HEIGHT - 92} ${PAGE_WIDTH} 92 re f`);

  commands.push("0.86 0.49 0.08 rg");
  commands.push(`0 ${PAGE_HEIGHT - 96} ${PAGE_WIDTH} 4 re f`);

  commands.push("BT");
  commands.push("/F2 18 Tf");
  commands.push("1 1 1 rg");
  commands.push(`${MARGIN_X} ${PAGE_HEIGHT - 46} Td`);
  commands.push(`(${escapePdfText("Web Search Pros")}) Tj`);
  commands.push("ET");

  commands.push("BT");
  commands.push("/F1 8 Tf");
  commands.push("1 1 1 rg");
  commands.push(`${MARGIN_X} ${PAGE_HEIGHT - 64} Td`);
  commands.push(`(${escapePdfText("Strategic What-If Success Story")}) Tj`);
  commands.push("ET");

  commands.push("BT");
  commands.push("/F2 10 Tf");
  commands.push("1 1 1 rg");
  commands.push(`${PAGE_WIDTH - MARGIN_X - 70} ${PAGE_HEIGHT - 52} Td`);
  commands.push(`(${escapePdfText(`Page ${pageNumber}`)}) Tj`);
  commands.push("ET");

  if (pageNumber === 1) {
    commands.push("BT");
    commands.push("/F2 20 Tf");
    commands.push("0.04 0.18 0.30 rg");
    commands.push(`${MARGIN_X} ${TOP_Y} Td`);
    commands.push(`(${escapePdfText(title)}) Tj`);
    commands.push("ET");

    commands.push("BT");
    commands.push("/F1 10 Tf");
    commands.push("0.39 0.45 0.55 rg");
    commands.push(`${MARGIN_X} ${TOP_Y - 22} Td`);
    commands.push(`(${escapePdfText(subtitle)}) Tj`);
    commands.push("ET");

    return TOP_Y - 54;
  }

  return TOP_Y;
}

function buildFooter() {
  const commands: string[] = [];

  commands.push("0.92 0.94 0.96 rg");
  commands.push(`${MARGIN_X} 52 ${PAGE_WIDTH - MARGIN_X * 2} 1 re f`);

  commands.push("BT");
  commands.push("/F1 8 Tf");
  commands.push("0.39 0.45 0.55 rg");
  commands.push(`${MARGIN_X} 36 Td`);
  commands.push(`(${escapePdfText("Prepared by Web Search Pros | This document is a strategic scenario, not a guarantee of results.")}) Tj`);
  commands.push("ET");

  return commands;
}

function renderLine(commands: string[], line: PdfLine, x: number, y: number, maxWidth: number) {
  const size = line.size ?? BODY_SIZE;
  const wrapped = wrapText(line.text, maxWidth, size);
  let cursorY = y;

  for (const wrappedLine of wrapped) {
    commands.push("BT");
    commands.push(`${fontCommand(line)} ${size} Tf`);
    commands.push(colorCommand(line.color));
    commands.push(`${x} ${cursorY} Td`);
    commands.push(`(${escapePdfText(wrappedLine)}) Tj`);
    commands.push("ET");
    cursorY -= Math.max(LINE_HEIGHT, size + 4);
  }

  cursorY -= line.gapAfter ?? 4;

  return cursorY;
}

function buildPages({
  title,
  subtitle,
  content,
}: {
  title: string;
  subtitle: string;
  content: string;
}) {
  const lines = contentLinesFromMarkdown(content);
  const pages: string[] = [];
  let commands: string[] = [];
  let pageNumber = 1;
  let y = buildPageHeader({ title, subtitle, pageNumber });
  const maxWidth = PAGE_WIDTH - MARGIN_X * 2;

  const startNewPage = () => {
    commands.push(...buildFooter());
    pages.push(commands.join("\n"));
    pageNumber += 1;
    commands = [];
    y = buildPageHeader({ title, subtitle, pageNumber });
  };

  for (const line of lines) {
    const size = line.size ?? BODY_SIZE;
    const estimatedLines = wrapText(line.text, maxWidth, size).length || 1;
    const needed = estimatedLines * Math.max(LINE_HEIGHT, size + 4) + (line.gapAfter ?? 4);

    if (y - needed < BOTTOM_Y) {
      startNewPage();
    }

    y = renderLine(commands, line, MARGIN_X, y, maxWidth);
  }

  commands.push(...buildFooter());
  pages.push(commands.join("\n"));

  return pages;
}

function pdfObject(content: string) {
  return `${content}\n`;
}

export function createSimplePdf({
  title,
  subtitle,
  content,
}: {
  title: string;
  subtitle: string;
  content: string;
}) {
  const pageStreams = buildPages({ title, subtitle, content });
  const objects: string[] = [];

  objects.push(pdfObject("<< /Type /Catalog /Pages 2 0 R >>"));

  const pageObjectIds = pageStreams.map((_, index) => 5 + index * 2);
  objects.push(pdfObject(`<< /Type /Pages /Kids [${pageObjectIds.map((id) => `${id} 0 R`).join(" ")}] /Count ${pageStreams.length} >>`));

  objects.push(pdfObject("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>"));
  objects.push(pdfObject("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>"));

  for (let i = 0; i < pageStreams.length; i += 1) {
    const pageObjectId = 5 + i * 2;
    const streamObjectId = pageObjectId + 1;
    const stream = pageStreams[i];

    objects.push(
      pdfObject(
        `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE_WIDTH} ${PAGE_HEIGHT}] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${streamObjectId} 0 R >>`
      )
    );

    objects.push(pdfObject(`<< /Length ${Buffer.byteLength(stream, "utf8")} >>\nstream\n${stream}\nendstream`));
  }

  const header = "%PDF-1.4\n";
  let body = "";
  const offsets: number[] = [0];

  for (let i = 0; i < objects.length; i += 1) {
    offsets.push(Buffer.byteLength(header + body, "utf8"));
    body += `${i + 1} 0 obj\n${objects[i]}endobj\n`;
  }

  const xrefOffset = Buffer.byteLength(header + body, "utf8");
  let xref = `xref\n0 ${objects.length + 1}\n`;
  xref += "0000000000 65535 f \n";

  for (let i = 1; i < offsets.length; i += 1) {
    xref += `${String(offsets[i]).padStart(10, "0")} 00000 n \n`;
  }

  const trailer = `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;

  return Buffer.from(header + body + xref + trailer, "utf8");
}
