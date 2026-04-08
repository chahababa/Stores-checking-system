import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const originalEnv = { ...process.env };

describe("supabase env helpers", () => {
  afterEach(() => {
    process.env = { ...originalEnv };
    vi.resetModules();
  });

  it("returns required env values", async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon-key";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "service-role-key";
    process.env.NEXT_PUBLIC_SITE_URL = "https://app.example.com";

    const mod = await import("@/lib/supabase/env");

    expect(mod.getSupabaseUrl()).toBe("https://example.supabase.co");
    expect(mod.getSupabaseAnonKey()).toBe("anon-key");
    expect(mod.getSupabaseServiceRoleKey()).toBe("service-role-key");
    expect(mod.getSiteUrl()).toBe("https://app.example.com");
  });

  it("throws clear error when env is missing", async () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;

    const mod = await import("@/lib/supabase/env");

    expect(() => mod.getSupabaseUrl()).toThrow("Missing required environment variable: NEXT_PUBLIC_SUPABASE_URL");
  });
});
