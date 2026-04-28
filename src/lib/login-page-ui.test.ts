import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const root = process.cwd();

function readSource(relativePath: string) {
  return readFileSync(join(root, relativePath), "utf8");
}

describe("login page neo brutalism UI", () => {
  it("uses the shared neo brutalism layout primitives instead of the legacy warm card", () => {
    const source = readSource("src/app/login/page.tsx");

    expect(source).toContain("nb-card");
    expect(source).toContain("nb-h1");
    expect(source).toContain("nb-stamp");
    expect(source).toContain("門市巡檢營運系統");
    expect(source).not.toContain("rounded-[32px] border border-ink/10 bg-white/85");
  });

  it("uses the shared neo brutalism button style for Google sign-in", () => {
    const source = readSource("src/app/login/login-button.tsx");

    expect(source).toContain("nb-btn-primary");
    expect(source).toContain("border-[2.5px] border-nb-ink");
    expect(source).not.toContain("rounded-full bg-warm");
  });
});
