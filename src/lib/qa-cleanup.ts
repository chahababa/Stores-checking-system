export function isQaMarkedText(value: string | null | undefined) {
  if (!value) return false;

  const normalized = value.trim().toLowerCase();
  return (
    normalized.startsWith("qa-") ||
    normalized.startsWith("測試用-") ||
    normalized.includes("qa 黑箱測試") ||
    normalized.includes("qa 回歸測試") ||
    normalized.includes("測試資料")
  );
}

export function isQaEmail(value: string | null | undefined) {
  if (!value) return false;
  return value.trim().toLowerCase().startsWith("qa-");
}

export function isQaStoreRecord(store: { code?: string | null; name?: string | null }) {
  return isQaMarkedText(store.name) || isQaMarkedText(store.code) || store.code?.toLowerCase() === "store_99";
}

export function isQaUserRecord(user: { email?: string | null; name?: string | null }) {
  return isQaEmail(user.email) || isQaMarkedText(user.name);
}

export function isQaStaffRecord(staff: { name?: string | null }) {
  return isQaMarkedText(staff.name);
}

export function isQaInspectionRecord(inspection: {
  timeSlot?: string | null;
  legacyNotes?: Array<string | null>;
}) {
  if (isQaMarkedText(inspection.timeSlot)) {
    return true;
  }

  return (inspection.legacyNotes ?? []).some((note) => isQaMarkedText(note));
}
