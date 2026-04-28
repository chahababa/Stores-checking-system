import { describe, expect, it } from "vitest";

import {
  getPhotoLimitMessage,
  MAX_COMPRESSED_IMAGE_BYTES,
  MAX_PHOTOS_PER_INSPECTION,
  MAX_PHOTOS_PER_ITEM,
} from "@/lib/photo-upload-limits";

describe("photo upload limits", () => {
  it("keeps compressed photos small enough for multiple-photo inspection submissions", () => {
    expect(MAX_COMPRESSED_IMAGE_BYTES).toBeLessThanOrEqual(400 * 1024);
  });

  it("caps photo counts before submitting the inspection payload", () => {
    expect(MAX_PHOTOS_PER_ITEM).toBe(3);
    expect(MAX_PHOTOS_PER_INSPECTION).toBe(10);
  });

  it("explains the photo limit in user-facing Traditional Chinese", () => {
    expect(getPhotoLimitMessage()).toContain("最多 10 張");
    expect(getPhotoLimitMessage()).toContain("每個項目最多 3 張");
    expect(getPhotoLimitMessage()).toContain("照片太多或太大");
  });
});
