export function cn(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ");
}

export function formatMonthValue(value?: string | null) {
  if (!value) return new Date().toISOString().slice(0, 7);
  return value;
}
