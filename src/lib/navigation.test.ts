import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { isNavigationLinkActive, normalizePathname } from "./navigation";

const root = process.cwd();

function readSource(relativePath: string) {
  return readFileSync(join(root, relativePath), "utf8");
}

describe("navigation active state", () => {
  it("marks only the exact active top-level route as active", () => {
    expect(isNavigationLinkActive("/inspection/improvements", "/inspection/improvements")).toBe(true);
    expect(isNavigationLinkActive("/inspection/improvements", "/inspection/history")).toBe(false);
    expect(isNavigationLinkActive("/inspection/reports", "/inspection/history")).toBe(false);
    expect(isNavigationLinkActive("/settings/focus-items", "/settings/staff")).toBe(false);
  });

  it("keeps parent detail routes active without matching sibling prefixes", () => {
    expect(isNavigationLinkActive("/inspection/history/abc", "/inspection/history")).toBe(true);
    expect(isNavigationLinkActive("/inspection/history/abc/edit", "/inspection/history")).toBe(true);
    expect(isNavigationLinkActive("/inspection/history-extra", "/inspection/history")).toBe(false);
    expect(isNavigationLinkActive("/settings/staffing", "/settings/staff")).toBe(false);
  });

  it("normalizes trailing slashes and treats home as exact-only", () => {
    expect(normalizePathname("/inspection/history/")).toBe("/inspection/history");
    expect(isNavigationLinkActive("/", "/")).toBe(true);
    expect(isNavigationLinkActive("/inspection/history", "/")).toBe(false);
  });

  it("uses the live client pathname so active labels update after client-side navigation", () => {
    const source = readSource("src/components/app-navigation.tsx");

    expect(source).toContain("usePathname");
    expect(source).toContain("clientPathname ?? initialPathname");
  });
});
