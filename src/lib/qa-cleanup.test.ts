import { describe, expect, it } from "vitest";

import {
  isQaEmail,
  isQaInspectionRecord,
  isQaMarkedText,
  isQaStaffRecord,
  isQaStoreRecord,
  isQaUserRecord,
} from "@/lib/qa-cleanup";

describe("qa cleanup markers", () => {
  it("detects QA-marked text prefixes and notes", () => {
    expect(isQaMarkedText("QA-測試員工A")).toBe(true);
    expect(isQaMarkedText("測試用-主管")).toBe(true);
    expect(isQaMarkedText("QA 黑箱測試資料，建立日期 2026-04-10。")).toBe(true);
    expect(isQaMarkedText("正式資料")).toBe(false);
  });

  it("detects QA emails and records", () => {
    expect(isQaEmail("qa-manager@example.com")).toBe(true);
    expect(isQaEmail("owner@example.com")).toBe(false);
    expect(isQaUserRecord({ email: "qa-leader@example.com", name: null })).toBe(true);
    expect(isQaUserRecord({ email: "owner@example.com", name: "QA-測試主管" })).toBe(true);
  });

  it("detects QA stores and staff", () => {
    expect(isQaStoreRecord({ code: "store_99", name: "QA-99店" })).toBe(true);
    expect(isQaStoreRecord({ code: "store_1", name: "1店" })).toBe(false);
    expect(isQaStaffRecord({ name: "QA-測試員工A" })).toBe(true);
  });

  it("detects QA inspections by time slot or legacy note", () => {
    expect(isQaInspectionRecord({ timeSlot: "QA-午班測試", legacyNotes: [] })).toBe(true);
    expect(isQaInspectionRecord({ timeSlot: "午班", legacyNotes: ["QA 回歸測試資料"] })).toBe(true);
    expect(isQaInspectionRecord({ timeSlot: "晚班", legacyNotes: ["正式巡店"] })).toBe(false);
  });
});
