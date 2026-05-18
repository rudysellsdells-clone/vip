export function splitList(value: FormDataEntryValue | null) {
  return String(value ?? "").split(/\n|,/).map((item) => item.trim()).filter(Boolean);
}

export function chooseAnchorText(options: string[] | null | undefined, fallback: string) {
  return options?.[0] || fallback;
}
