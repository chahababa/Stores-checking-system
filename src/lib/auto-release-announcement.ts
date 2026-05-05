export type AutoReleaseAnnouncementInput = {
  commitSha: string;
  commitSubject: string;
  commitBody?: string | null;
  repository?: string | null;
  commitUrl?: string | null;
  publishedOn?: string | null;
};

export type AutoReleaseAnnouncement = {
  title: string;
  summary: string;
  audience: "all";
  publishedOn: string;
  isActive: true;
  sourceType: "github";
  sourceRef: string;
};

const CONVENTIONAL_TYPE_LABELS: Record<string, string> = {
  feat: "新功能",
  fix: "修正",
  docs: "文件更新",
  refactor: "系統調整",
  perf: "效能改善",
  test: "測試更新",
  chore: "系統維護",
  ci: "部署流程更新",
};

function getTodayIsoDate() {
  return new Date().toISOString().slice(0, 10);
}

function parseCommitSubject(subject: string) {
  const withoutPrNumber = subject.trim().replace(/\s*\(#\d+\)\s*$/, "");
  const match = withoutPrNumber.match(/^([a-z]+)(?:\([^)]+\))?:\s*(.+)$/i);

  if (!match) {
    return {
      label: "系統更新",
      cleanSubject: withoutPrNumber || "系統已更新",
    };
  }

  const [, type, description] = match;
  return {
    label: CONVENTIONAL_TYPE_LABELS[type.toLowerCase()] ?? "系統更新",
    cleanSubject: description.trim() || withoutPrNumber,
  };
}

function extractSummaryLines(body?: string | null) {
  if (!body) return [];

  return body
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line) => !line.toLowerCase().startsWith("co-authored-by:"))
    .filter((line) => !line.toLowerCase().startsWith("signed-off-by:"))
    .filter((line) => line.startsWith("-") || line.startsWith("*"))
    .slice(0, 6)
    .map((line) => (line.startsWith("*") ? `-${line.slice(1)}` : line));
}

export function buildAutoReleaseAnnouncement(input: AutoReleaseAnnouncementInput): AutoReleaseAnnouncement {
  const commitSha = input.commitSha.trim();
  if (!commitSha) {
    throw new Error("commitSha is required");
  }

  const { label, cleanSubject } = parseCommitSubject(input.commitSubject);
  const summaryLines = extractSummaryLines(input.commitBody);
  const shortSha = commitSha.slice(0, 7);
  const sourceParts = [input.repository?.trim(), shortSha].filter(Boolean);
  const sourceLine = `來源：${sourceParts.length === 2 ? `${sourceParts[0]} @ ${sourceParts[1]}` : shortSha}`;
  const commitUrl = input.commitUrl?.trim();

  return {
    title: `${label}：${cleanSubject}`,
    summary: [
      summaryLines.length > 0 ? summaryLines.join("\n") : `已更新系統：${cleanSubject}`,
      [sourceLine, commitUrl].filter(Boolean).join("\n"),
    ]
      .filter(Boolean)
      .join("\n\n"),
    audience: "all",
    publishedOn: input.publishedOn?.trim() || getTodayIsoDate(),
    isActive: true,
    sourceType: "github",
    sourceRef: `github:${commitSha}`,
  };
}
