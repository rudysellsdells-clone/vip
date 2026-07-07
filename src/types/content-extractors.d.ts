declare module "pdf-parse" {
  type PdfParseResult = {
    text: string;
    numpages?: number;
    info?: Record<string, unknown>;
    metadata?: unknown;
  };

  function pdfParse(buffer: Buffer): Promise<PdfParseResult>;
  export default pdfParse;
}

declare module "mammoth" {
  export function extractRawText(input: { buffer: Buffer }): Promise<{
    value: string;
    messages: Array<Record<string, unknown>>;
  }>;
}
