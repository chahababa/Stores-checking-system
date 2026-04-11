export type InspectionGrade = "A" | "B" | "C";
export type InspectionTagType = "critical" | "monthly_attention" | "complaint_watch";

export type GradeableScore = {
  categoryName: string;
  score: 1 | 2 | 3;
  tagTypes?: InspectionTagType[];
};

export type CategoryGradeSummary = {
  categoryName: string;
  averageScore: number;
  grade: InspectionGrade;
  itemCount: number;
  counts: {
    a: number;
    b: number;
    c: number;
  };
};

export type OverallInspectionGrade = {
  averageScore: number;
  baseGrade: InspectionGrade;
  finalGrade: InspectionGrade;
  adjustments: string[];
  counts: {
    a: number;
    b: number;
    c: number;
  };
};

export type TagIssueCounts = {
  critical: number;
  monthlyAttention: number;
  complaintWatch: number;
};

export function getScoreGrade(score: 1 | 2 | 3): InspectionGrade {
  if (score === 3) return "A";
  if (score === 2) return "B";
  return "C";
}

export function getAverageGrade(value: number): InspectionGrade {
  if (value >= 2.5) return "A";
  if (value >= 1.5) return "B";
  return "C";
}

export function downgradeGrade(grade: InspectionGrade, steps = 1): InspectionGrade {
  const order: InspectionGrade[] = ["A", "B", "C"];
  const index = order.indexOf(grade);
  return order[Math.min(index + steps, order.length - 1)];
}

export function buildCategoryGrades(scores: GradeableScore[]): CategoryGradeSummary[] {
  const groups = new Map<string, GradeableScore[]>();

  for (const row of scores) {
    const group = groups.get(row.categoryName) ?? [];
    group.push(row);
    groups.set(row.categoryName, group);
  }

  return [...groups.entries()].map(([categoryName, rows]) => {
    const averageScore = rows.reduce((sum, row) => sum + row.score, 0) / Math.max(rows.length, 1);
    const counts = rows.reduce(
      (acc, row) => {
        const grade = getScoreGrade(row.score);
        if (grade === "A") acc.a += 1;
        if (grade === "B") acc.b += 1;
        if (grade === "C") acc.c += 1;
        return acc;
      },
      { a: 0, b: 0, c: 0 },
    );

    return {
      categoryName,
      averageScore,
      grade: getAverageGrade(averageScore),
      itemCount: rows.length,
      counts,
    };
  });
}

export function buildTagIssueCounts(scores: GradeableScore[]): TagIssueCounts {
  return scores.reduce(
    (acc, row) => {
      if (row.score > 2) {
        return acc;
      }

      if (row.tagTypes?.includes("critical")) {
        acc.critical += 1;
      }

      if (row.tagTypes?.includes("monthly_attention")) {
        acc.monthlyAttention += 1;
      }

      if (row.tagTypes?.includes("complaint_watch")) {
        acc.complaintWatch += 1;
      }

      return acc;
    },
    {
      critical: 0,
      monthlyAttention: 0,
      complaintWatch: 0,
    },
  );
}

export function buildOverallInspectionGrade(scores: GradeableScore[]): OverallInspectionGrade {
  const counts = scores.reduce(
    (acc, row) => {
      const grade = getScoreGrade(row.score);
      if (grade === "A") acc.a += 1;
      if (grade === "B") acc.b += 1;
      if (grade === "C") acc.c += 1;
      return acc;
    },
    { a: 0, b: 0, c: 0 },
  );

  const averageScore = scores.length > 0 ? scores.reduce((sum, row) => sum + row.score, 0) / scores.length : 0;
  const baseGrade = getAverageGrade(averageScore || 0);
  const adjustments: string[] = [];
  let finalGrade = baseGrade;

  const criticalFailures = scores.filter((row) => row.tagTypes?.includes("critical") && row.score === 1).length;
  const criticalConcerns = scores.filter((row) => row.tagTypes?.includes("critical") && row.score <= 2).length;
  const complaintIssues = scores.filter((row) => row.tagTypes?.includes("complaint_watch") && row.score <= 2).length;
  const monthlyAttentionIssues = scores.filter(
    (row) => row.tagTypes?.includes("monthly_attention") && row.score <= 2,
  ).length;

  if (criticalFailures > 0 && finalGrade === "A") {
    finalGrade = "B";
    adjustments.push("必查項目出現 C，總評最高只能為 B。");
  }

  if (criticalConcerns >= 2) {
    finalGrade = downgradeGrade(finalGrade);
    adjustments.push("必查項目有 2 題以上落在 B / C，總評下降一級。");
  }

  if (complaintIssues >= 1) {
    finalGrade = downgradeGrade(finalGrade);
    adjustments.push("客訴項目出現 B / C，總評下降一級。");
  }

  if (monthlyAttentionIssues >= 2) {
    finalGrade = downgradeGrade(finalGrade);
    adjustments.push("本月加強項目有 2 題以上落在 B / C，總評下降一級。");
  }

  return {
    averageScore,
    baseGrade,
    finalGrade,
    adjustments,
    counts,
  };
}
