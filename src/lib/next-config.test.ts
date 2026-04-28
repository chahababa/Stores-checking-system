import { describe, expect, it } from "vitest";

import nextConfig from "../../next.config";

describe("Next.js Server Action upload configuration", () => {
  it("raises the Server Action body limit so compressed inspection photos can be submitted", () => {
    expect((nextConfig as { experimental?: { serverActions?: { bodySizeLimit?: string } } }).experimental?.serverActions)
      .toMatchObject({ bodySizeLimit: "8mb" });
  });
});
