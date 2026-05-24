type FormatterInput = {
  title: string;
  content: string;
  includeDefaultCta?: boolean;
};

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function stripInternalTraceLines(content: string) {
  return content
    .split("\n")
    .filter((line) => {
      const trimmed = line.trim();

      if (/^Quality resubmission based on review:/i.test(trimmed)) return false;
      if (/^Original asset ID:/i.test(trimmed)) return false;
      if (/^Source asset:/i.test(trimmed)) return false;
      if (/^Source asset ID:/i.test(trimmed)) return false;

      return true;
    })
    .join("\n")
    .trim();
}

function hasMeaningfulHtml(content: string) {
  return /<\/?(h2|h3|p|ul|ol|li|blockquote|strong|em|div|section|figure|table)\b/i.test(content);
}

function sanitizeExistingHtml(content: string) {
  return stripInternalTraceLines(content)
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, "")
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, "")
    .replace(/\son[a-z]+\s*=\s*"[^"]*"/gi, "")
    .replace(/\son[a-z]+\s*=\s*'[^']*'/gi, "")
    .trim();
}

function inlineMarkdown(value: string) {
  let text = escapeHtml(value.trim());

  text = text.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  text = text.replace(/\*([^*]+)\*/g, "<em>$1</em>");
  text = text.replace(/\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g, '<a href="$2">$1</a>');

  return text;
}

function isBullet(line: string) {
  return /^[-*•]\s+/.test(line.trim());
}

function bulletText(line: string) {
  return line.trim().replace(/^[-*•]\s+/, "").trim();
}

function isNumbered(line: string) {
  return /^\d+[.)]\s+/.test(line.trim());
}

function numberedText(line: string) {
  return line.trim().replace(/^\d+[.)]\s+/, "").trim();
}

function isLikelyHeading(line: string) {
  const trimmed = line.trim();

  if (!trimmed) return false;
  if (trimmed.length > 90) return false;
  if (/[.!?]$/.test(trimmed)) return false;
  if (/^[-*•]\s+/.test(trimmed)) return false;
  if (/^\d+[.)]\s+/.test(trimmed)) return false;
  if (/^https?:\/\//i.test(trimmed)) return false;

  return /^(why|what|how|when|where|the|key|best|common|next|final|faqs?|frequently asked|takeaway|conclusion|summary|benefits|steps|strategy|examples|results|recommendations)\b/i.test(trimmed);
}

function headingLevel(line: string) {
  if (/^#{3}\s+/.test(line)) return 3;
  if (/^#{2}\s+/.test(line)) return 2;
  if (/^#\s+/.test(line)) return 2;
  if (/^faqs?|frequently asked/i.test(line.trim())) return 2;
  return 2;
}

function headingText(line: string) {
  return line.replace(/^#{1,6}\s+/, "").trim();
}

function paragraphToHtml(paragraph: string) {
  const cleaned = paragraph.replace(/\s+/g, " ").trim();

  if (!cleaned) return "";

  return `<p>${inlineMarkdown(cleaned)}</p>`;
}

function defaultCtaHtml() {
  const custom = process.env.WORDPRESS_DEFAULT_CTA_HTML?.trim();

  if (custom) {
    return sanitizeExistingHtml(custom);
  }

  return [
    '<div class="vip-cta">',
    "<h2>Ready to Improve Your Visibility?</h2>",
    "<p>If your business needs stronger visibility across Google, AI search, and the places customers look before they buy, Web Search Pros can help you build a practical strategy.</p>",
    "<p><strong>Start with a visibility review and see where your best opportunities are.</strong></p>",
    "</div>",
  ].join("\n");
}

function contentAlreadyHasCta(content: string) {
  return /(call to action|ready to|schedule|contact us|get started|book|visibility review|consultation)/i.test(content);
}

function normalizeBlankLines(content: string) {
  return content
    .replace(/\r\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function formatBlogPostForWordPressHtml(input: FormatterInput) {
  const title = input.title?.trim() || "Untitled Blog Post";
  const raw = normalizeBlankLines(stripInternalTraceLines(input.content ?? ""));

  if (!raw) {
    return `<p>${escapeHtml(title)}</p>`;
  }

  if (hasMeaningfulHtml(raw)) {
    const sanitized = sanitizeExistingHtml(raw);

    if (input.includeDefaultCta === false || contentAlreadyHasCta(sanitized)) {
      return sanitized;
    }

    return [sanitized, defaultCtaHtml()].join("\n\n");
  }

  const lines = raw.split("\n");
  const html: string[] = [];
  let paragraphBuffer: string[] = [];
  let listBuffer: string[] = [];
  let orderedListBuffer: string[] = [];

  function flushParagraph() {
    if (!paragraphBuffer.length) return;

    const paragraph = paragraphBuffer.join(" ");
    const rendered = paragraphToHtml(paragraph);

    if (rendered) html.push(rendered);

    paragraphBuffer = [];
  }

  function flushList() {
    if (listBuffer.length) {
      html.push("<ul>");
      for (const item of listBuffer) {
        html.push(`  <li>${inlineMarkdown(item)}</li>`);
      }
      html.push("</ul>");
      listBuffer = [];
    }

    if (orderedListBuffer.length) {
      html.push("<ol>");
      for (const item of orderedListBuffer) {
        html.push(`  <li>${inlineMarkdown(item)}</li>`);
      }
      html.push("</ol>");
      orderedListBuffer = [];
    }
  }

  for (const line of lines) {
    const trimmed = line.trim();

    if (!trimmed) {
      flushParagraph();
      flushList();
      continue;
    }

    if (/^#{1,6}\s+/.test(trimmed) || isLikelyHeading(trimmed)) {
      flushParagraph();
      flushList();

      const level = headingLevel(trimmed);
      html.push(`<h${level}>${inlineMarkdown(headingText(trimmed))}</h${level}>`);
      continue;
    }

    if (isBullet(trimmed)) {
      flushParagraph();
      orderedListBuffer = [];
      listBuffer.push(bulletText(trimmed));
      continue;
    }

    if (isNumbered(trimmed)) {
      flushParagraph();
      listBuffer = [];
      orderedListBuffer.push(numberedText(trimmed));
      continue;
    }

    paragraphBuffer.push(trimmed);
  }

  flushParagraph();
  flushList();

  const formatted = html.join("\n\n").trim();

  if (input.includeDefaultCta === false || contentAlreadyHasCta(formatted)) {
    return formatted;
  }

  return [formatted, defaultCtaHtml()].join("\n\n");
}

export function buildWordPressExcerpt(content: string, maxLength = 155) {
  const plain = stripInternalTraceLines(content)
    .replace(/<[^>]+>/g, " ")
    .replace(/[#*_>`~]/g, "")
    .replace(/\s+/g, " ")
    .trim();

  if (plain.length <= maxLength) return plain;

  const truncated = plain.slice(0, maxLength - 1);
  const lastSpace = truncated.lastIndexOf(" ");

  return `${truncated.slice(0, lastSpace > 80 ? lastSpace : truncated.length).trim()}…`;
}
