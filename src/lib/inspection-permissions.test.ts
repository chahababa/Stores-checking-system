import { describe, expect, it } from "vitest";

import { canDeleteInspectionReport, canManageInspectionReport } from "@/lib/inspection-permissions";

describe("inspection report permissions", () => {
  it("does not allow store leaders to manage or delete inspection reports", () => {
    const leaderProfile = {
      id: "leader-1",
      email: "leader@example.com",
      name: "店長",
      role: "leader" as const,
      store_id: "store-1",
      is_active: true,
      line_user_id: null,
    };

    expect(canManageInspectionReport(leaderProfile)).toBe(false);
    expect(canDeleteInspectionReport(leaderProfile)).toBe(false);
  });

  it("keeps delete permission owner-only, even when the real owner is viewing as a store leader", () => {
    const ownerViewingAsLeader = {
      id: "owner-1",
      email: "owner@example.com",
      name: "系統擁有者",
      role: "leader" as const,
      store_id: "store-1",
      is_active: true,
      line_user_id: null,
      impersonating: {
        realRole: "owner" as const,
        realStoreId: null,
      },
    };

    expect(canManageInspectionReport(ownerViewingAsLeader)).toBe(false);
    expect(canDeleteInspectionReport(ownerViewingAsLeader)).toBe(false);
  });

  it("allows owners to manage and delete reports while managers can only manage them", () => {
    const ownerProfile = {
      id: "owner-1",
      email: "owner@example.com",
      name: "系統擁有者",
      role: "owner" as const,
      store_id: null,
      is_active: true,
      line_user_id: null,
    };
    const managerProfile = {
      id: "manager-1",
      email: "manager@example.com",
      name: "主管",
      role: "manager" as const,
      store_id: null,
      is_active: true,
      line_user_id: null,
    };

    expect(canManageInspectionReport(ownerProfile)).toBe(true);
    expect(canDeleteInspectionReport(ownerProfile)).toBe(true);
    expect(canManageInspectionReport(managerProfile)).toBe(true);
    expect(canDeleteInspectionReport(managerProfile)).toBe(false);
  });
});
