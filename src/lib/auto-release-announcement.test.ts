import { describe, expect, it } from "vitest";

import { buildAutoReleaseAnnouncement } from "@/lib/auto-release-announcement";

describe("buildAutoReleaseAnnouncement", () => {
  it("turns a merged feature commit into an all-user system update announcement", () => {
    const announcement = buildAutoReleaseAnnouncement({
      commitSha: "24d66922987a4c9123adc761dd71460da43d668d",
      commitSubject: "feat: add release update notifications (#12)",
      commitBody: "- Add a new settings page\n- Add published announcements to notifications\n\nCo-authored-by: chahababa <user@example.com>",
      repository: "chahababa/Stores-checking-system",
      commitUrl: "https://github.com/chahababa/Stores-checking-system/commit/24d6692",
      publishedOn: "2026-05-04",
    });

    expect(announcement).toEqual({
      title: "新功能：add release update notifications",
      summary:
        "- Add a new settings page\n- Add published announcements to notifications\n\n來源：chahababa/Stores-checking-system @ 24d6692\nhttps://github.com/chahababa/Stores-checking-system/commit/24d6692",
      audience: "all",
      publishedOn: "2026-05-04",
      isActive: true,
      sourceType: "github",
      sourceRef: "github:24d66922987a4c9123adc761dd71460da43d668d",
    });
  });

  it("uses a safe fallback summary when the commit has no useful body bullets", () => {
    const announcement = buildAutoReleaseAnnouncement({
      commitSha: "abcdef1234567890",
      commitSubject: "fix(settings): correct release announcement validation (#13)",
      commitBody: "Co-authored-by: bot <bot@example.com>",
      publishedOn: "2026-05-05",
    });

    expect(announcement.title).toBe("修正：correct release announcement validation");
    expect(announcement.summary).toContain("已更新系統：correct release announcement validation");
    expect(announcement.summary).toContain("來源：abcdef1");
    expect(announcement.audience).toBe("all");
    expect(announcement.sourceRef).toBe("github:abcdef1234567890");
  });
});
