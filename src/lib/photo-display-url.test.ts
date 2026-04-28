import { describe, expect, it } from "vitest";

import { normalizePhotoDisplayUrl } from "@/lib/photo-display-url";

describe("normalizePhotoDisplayUrl", () => {
  it("percent-encodes storage object path characters that can break image rendering", () => {
    const rawUrl = "https://example.supabase.co/storage/v1/object/public/inspection-photos/A 店/2026-04-28/item/照片 (1).jpg";

    expect(normalizePhotoDisplayUrl(rawUrl)).toBe(
      "https://example.supabase.co/storage/v1/object/public/inspection-photos/A%20%E5%BA%97/2026-04-28/item/%E7%85%A7%E7%89%87%20(1).jpg",
    );
  });

  it("does not double-encode URLs that are already encoded", () => {
    const encodedUrl =
      "https://example.supabase.co/storage/v1/object/public/inspection-photos/A%20%E5%BA%97/2026-04-28/item/%E7%85%A7%E7%89%87%20(1).jpg";

    expect(normalizePhotoDisplayUrl(encodedUrl)).toBe(encodedUrl);
  });

  it("returns non-URL values unchanged", () => {
    expect(normalizePhotoDisplayUrl("not a url")).toBe("not a url");
  });
});
