import { createSimplePdf } from "@/lib/pdf/simple-pdf";

function read(value: unknown, fallback = "") {
  const cleaned = String(value ?? "").trim();
  return cleaned || fallback;
}

export function buildWhatIfPdf({
  assetTitle,
  assetContent,
  businessName,
}: {
  assetTitle: string;
  assetContent: string;
  businessName?: string | null;
}) {
  const title = read(assetTitle, "What-If Success Story");
  const subtitle = businessName
    ? `Prepared for ${businessName}`
    : "Personalized strategic scenario";

  const brandedContent = [
    "# Strategic What-If Scenario",
    "",
    "This document is a strategic what-if scenario, not a completed case study or promised result. It is designed to help visualize what could be possible with the right visibility, content, and follow-up system.",
    "",
    assetContent,
    "",
    "## Next Step",
    "If this direction feels relevant, the next step is a strategy conversation to map the opportunity to the business, market, and timing.",
  ].join("\n");

  return createSimplePdf({
    title,
    subtitle,
    content: brandedContent,
  });
}

export function inferBusinessNameFromTitle(title: string) {
  const cleaned = title.replace(/^What-If Success Story:\s*/i, "").trim();

  return cleaned || null;
}

export function buildWhatIfEmailDraft({
  assetTitle,
  businessName,
  pdfUrl,
}: {
  assetTitle: string;
  businessName?: string | null;
  pdfUrl: string;
}) {
  const target = businessName || "your business";

  return {
    subject: `A strategic what-if scenario for ${target}`,
    body: [
      `Hi,`,
      "",
      `I put together a short strategic what-if scenario for ${target}.`,
      "",
      "This is not a case study or a promised result. It is a practical preview of what could be possible if visibility, content, AI search presence, follow-up, and conversion strategy were working together as one system.",
      "",
      "I attached the PDF version so it is easy to review and share.",
      "",
      "If this direction feels relevant, I would be happy to walk through what this could look like in more detail.",
      "",
      "Best,",
      "Rudy",
      "",
      `PDF: ${pdfUrl}`,
      "",
      `Reference: ${assetTitle}`,
    ].join("\n"),
  };
}
