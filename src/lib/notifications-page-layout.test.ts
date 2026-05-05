import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const root = process.cwd();

function readSource(relativePath: string) {
  return readFileSync(join(root, relativePath), "utf8");
}

describe("notifications page layout", () => {
  it("keeps priority columns and notification cards inside their grid column", () => {
    const source = readSource("src/app/(protected)/notifications/page.tsx");

    expect(source).toContain("xl:grid-cols-[repeat(3,minmax(0,1fr))]");
    expect(source).toContain("min-w-0");
    expect(source).toContain("overflow-hidden");
    expect(source).toContain("break-words");
  });
});
