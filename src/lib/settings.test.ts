import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

const requireRoleMock = vi.fn();
const createAuditLogMock = vi.fn();

const staffInsertSingleMock = vi.fn();
const staffInsertSelectMock = vi.fn(() => ({
  single: staffInsertSingleMock,
}));
const staffInsertMock = vi.fn(() => ({
  select: staffInsertSelectMock,
}));

const staffUpdateEqMock = vi.fn();
const staffUpdateMock = vi.fn(() => ({
  eq: staffUpdateEqMock,
}));

const staffSelectMaybeSingleMock = vi.fn();
const staffSelectEqIdMock = vi.fn(() => ({
  maybeSingle: staffSelectMaybeSingleMock,
}));
const staffSelectMock = vi.fn(() => ({
  eq: staffSelectEqIdMock,
}));

const workstationMaybeSingleMock = vi.fn();
const workstationEqActiveMock = vi.fn(() => ({
  maybeSingle: workstationMaybeSingleMock,
}));
const workstationEqIdMock = vi.fn(() => ({
  eq: workstationEqActiveMock,
}));
const workstationSelectMock = vi.fn(() => ({
  eq: workstationEqIdMock,
}));

const fromMock = vi.fn((table: string) => {
  if (table === "staff_members") {
    return {
      insert: staffInsertMock,
      update: staffUpdateMock,
      select: staffSelectMock,
    };
  }

  if (table === "workstations") {
    return {
      select: workstationSelectMock,
    };
  }

  throw new Error(`Unexpected table: ${table}`);
});

vi.mock("@/lib/auth", () => ({
  requireRole: requireRoleMock,
}));

vi.mock("@/lib/audit", () => ({
  createAuditLog: createAuditLogMock,
}));

vi.mock("@/lib/qa-cleanup", () => ({
  isQaInspectionRecord: vi.fn(() => false),
  isQaStaffRecord: vi.fn(() => false),
  isQaStoreRecord: vi.fn(() => false),
  isQaUserRecord: vi.fn(() => false),
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    from: fromMock,
  }),
}));

describe("staff member leader permissions", () => {
  beforeEach(() => {
    vi.resetModules();
    requireRoleMock.mockReset();
    createAuditLogMock.mockReset();
    fromMock.mockClear();

    staffInsertMock.mockClear();
    staffInsertSelectMock.mockClear();
    staffInsertSingleMock.mockReset();

    staffUpdateMock.mockClear();
    staffUpdateEqMock.mockReset();

    staffSelectMock.mockClear();
    staffSelectEqIdMock.mockClear();
    staffSelectMaybeSingleMock.mockReset();

    workstationSelectMock.mockClear();
    workstationEqIdMock.mockClear();
    workstationEqActiveMock.mockClear();
    workstationMaybeSingleMock.mockReset();

    requireRoleMock.mockResolvedValue({
      id: "leader-user",
      email: "leader@example.com",
      role: "leader",
      store_id: "store-1",
    });
    staffInsertSingleMock.mockResolvedValue({
      data: { id: "staff-1" },
      error: null,
    });
    staffUpdateEqMock.mockResolvedValue({ error: null });
    staffSelectMaybeSingleMock.mockResolvedValue({
      data: { id: "staff-1", store_id: "store-1" },
      error: null,
    });
    workstationMaybeSingleMock.mockResolvedValue({ data: null, error: null });
    createAuditLogMock.mockResolvedValue(undefined);
  });

  it("allows leader to create staff for their own store", async () => {
    const { createStaffMember } = await import("@/lib/settings");

    await createStaffMember({
      storeId: "store-1",
      name: "小明",
    });

    expect(requireRoleMock).toHaveBeenCalledWith("owner", "manager", "leader");
    expect(fromMock).toHaveBeenCalledWith("staff_members");
    expect(staffInsertMock).toHaveBeenCalledWith({
      store_id: "store-1",
      name: "小明",
      position: null,
      default_workstation_id: null,
      status: "active",
    });
  });

  it("rejects leader creating staff for another store", async () => {
    const { createStaffMember } = await import("@/lib/settings");

    await expect(
      createStaffMember({
        storeId: "store-2",
        name: "小美",
      }),
    ).rejects.toThrow("店長只能新增自己店別的組員");
  });

  it("allows leader to archive staff in their own store", async () => {
    const { archiveStaffMember } = await import("@/lib/settings");

    await archiveStaffMember("staff-1");

    expect(requireRoleMock).toHaveBeenCalledWith("owner", "manager", "leader");
    expect(staffSelectMock).toHaveBeenCalledWith("id, store_id");
    expect(staffUpdateMock).toHaveBeenCalledWith({
      status: "archived",
      archived_at: expect.any(String),
    });
  });

  it("rejects leader archiving staff from another store", async () => {
    staffSelectMaybeSingleMock.mockResolvedValue({
      data: { id: "staff-2", store_id: "store-2" },
      error: null,
    });

    const { archiveStaffMember } = await import("@/lib/settings");

    await expect(archiveStaffMember("staff-2")).rejects.toThrow("店長只能管理自己店別的組員");
  });

  it("allows leader to restore staff in their own store", async () => {
    const { restoreStaffMember } = await import("@/lib/settings");

    await restoreStaffMember("staff-1");

    expect(requireRoleMock).toHaveBeenCalledWith("owner", "manager", "leader");
    expect(staffUpdateMock).toHaveBeenCalledWith({
      status: "active",
      archived_at: null,
    });
  });

  it("rejects leader restoring staff from another store", async () => {
    staffSelectMaybeSingleMock.mockResolvedValue({
      data: { id: "staff-2", store_id: "store-2" },
      error: null,
    });

    const { restoreStaffMember } = await import("@/lib/settings");

    await expect(restoreStaffMember("staff-2")).rejects.toThrow("店長只能管理自己店別的組員");
  });
});
