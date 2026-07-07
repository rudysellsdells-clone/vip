export type ParsedKnowledgeDocument = {
  text: string;
  detectedType: "pdf" | "docx" | "text";
};

const MAX_KNOWLEDGE_DOCUMENT_SIZE_BYTES = 20 * 1024 * 1024;
const MAX_STORED_TEXT_LENGTH = 120_000;

function extensionFor(fileName: string) {
  return fileName.match(/\.([a-z0-9]+)$/i)?.[1]?.toLowerCase() ?? "";
}

function cleanExtractedText(value: unknown) {
  return String(value ?? "")
    .replace(/\u0000/g, "")
    .replace(/[\t ]+/g, " ")
    .replace(/\n{4,}/g, "\n\n\n")
    .trim()
    .slice(0, MAX_STORED_TEXT_LENGTH);
}

function fileKind(file: File) {
  const extension = extensionFor(file.name || "");
  const type = file.type || "";

  if (extension === "pdf" || type === "application/pdf") return "pdf";
  if (
    extension === "docx" ||
    type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  ) {
    return "docx";
  }
  if (extension === "txt" || type.startsWith("text/")) return "text";

  return null;
}

export function supportedKnowledgeDocumentLabel() {
  return "PDF, DOCX, or TXT";
}

export async function parseKnowledgeDocument(file: File): Promise<ParsedKnowledgeDocument> {
  if (!file.size) {
    throw new Error("Please choose a document to upload.");
  }

  if (file.size > MAX_KNOWLEDGE_DOCUMENT_SIZE_BYTES) {
    throw new Error("Knowledge documents must be 20MB or smaller.");
  }

  const kind = fileKind(file);

  if (!kind) {
    throw new Error(`Unsupported file type. Upload a ${supportedKnowledgeDocumentLabel()} file.`);
  }

  if (kind === "text") {
    const text = cleanExtractedText(await file.text());

    if (!text) {
      throw new Error("VIP could not read any text from this document.");
    }

    return { text, detectedType: "text" };
  }

  const bytes = Buffer.from(await file.arrayBuffer());

  if (kind === "pdf") {
    const { default: pdfParse } = await import("pdf-parse");
    const parsed = await pdfParse(bytes);
    const text = cleanExtractedText(parsed.text);

    if (!text) {
      throw new Error("VIP could not extract readable text from this PDF. Try exporting it as text or DOCX and upload again.");
    }

    return { text, detectedType: "pdf" };
  }

  const mammoth = await import("mammoth");
  const parsed = await mammoth.extractRawText({ buffer: bytes });
  const text = cleanExtractedText(parsed.value);

  if (!text) {
    throw new Error("VIP could not extract readable text from this DOCX file.");
  }

  return { text, detectedType: "docx" };
}
