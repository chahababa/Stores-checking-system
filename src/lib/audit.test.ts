import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const insertMock = vi.fn();
const fromMock = vi.fn(() => ({
  insert: insertMock,
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    from: fromMock,
  }),
}));

describe("createAuditLog", () => {
  beforeEach(() => {
    insertMock.mockReset();
    fromMock.mockClear();
  });

  it("writes audit log payload with defaults", async () => {
    insertMock.mockResolvedValue({ error: null });

    const { createAuditLog } = await import("@/lib/audit");
    await createAuditLog({
      action: "test_action",
      entityType: "inspection",
      entityId: "123",
    });

    expect(fromMock).toHaveBeenCalledWith("audit_logs");
    expect(insertMock).toHaveBeenCalledWith({
      actor_id: null,
      actor_email: null,
      action: "test_action",
      entity_type: "inspection",
      entity_id: "123",
      details: {},
    });
  });

  it("throws when insert fails", async () => {
    insertMock.mockResolvedValue({ error: { message: "boom" } });

    const { createAuditLog } = await import("@/lib/audit");

    await expect(
      createAuditLog({
        actorId: "u1",
        actorEmail: "owner@example.com",
        action: "test_action",
        entityType: "inspection",
        entityId: "123",
        details: { status: "pending" },
      }),
    ).rejects.toThrow("boom");
  });
});
