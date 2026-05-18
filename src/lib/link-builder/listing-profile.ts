export function splitTextareaList(value: FormDataEntryValue | null) {
  return String(value ?? "")
    .split(/\n|,/)
    .map((item) => item.trim())
    .filter(Boolean);
}

export function buildSubmissionDescription({
  directoryName,
  shortDescription,
  longDescription,
}: {
  directoryName?: string | null;
  shortDescription?: string | null;
  longDescription?: string | null;
}) {
  const preferred = longDescription || shortDescription || "";

  if (!preferred) {
    return "";
  }

  if (!directoryName) {
    return preferred;
  }

  return preferred.replaceAll("[DIRECTORY_NAME]", directoryName);
}

export function chooseAnchorText(anchorTextOptions: string[], fallback: string) {
  return anchorTextOptions[0] ?? fallback;
}
