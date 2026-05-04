export type PriorInspectionScoreRow = {
  item_id: string;
  score: number | null;
};

export type PriorInspectionRow = {
  id: string;
  date: string;
  inspection_scores?: PriorInspectionScoreRow[] | null;
};

const ONE_WEEK_MS = 1000 * 60 * 60 * 24 * 7;

function normalizeDate(value: string) {
  return new Date(`${value}T00:00:00`);
}

function calculateWeekSpan(fromDate: string, toDate: string) {
  const diffMs = normalizeDate(toDate).getTime() - normalizeDate(fromDate).getTime();
  return Math.max(1, Math.ceil(diffMs / ONE_WEEK_MS));
}

function isLowScore(score: number | null | undefined) {
  return (score ?? 3) <= 2;
}

export function buildPreviousIssueMap(inspections: PriorInspectionRow[], selectedDate: string) {
  const previousIssues = new Map<string, { consecutiveWeeks: number }>();
  if (inspections.length === 0) {
    return previousIssues;
  }

  const latestInspection = inspections[0];
  const latestLowScores = (latestInspection.inspection_scores ?? []).filter((row) => isLowScore(row.score));

  for (const latestRow of latestLowScores) {
    let firstLowDate = latestInspection.date;

    for (let index = 1; index < inspections.length; index += 1) {
      const inspection = inspections[index];
      const matchingScore = (inspection.inspection_scores ?? []).find((score) => score.item_id === latestRow.item_id);

      if (!matchingScore) {
        break;
      }

      if (isLowScore(matchingScore.score)) {
        firstLowDate = inspection.date;
        continue;
      }

      break;
    }

    previousIssues.set(latestRow.item_id, {
      consecutiveWeeks: calculateWeekSpan(firstLowDate, selectedDate),
    });
  }

  return previousIssues;
}

export function getPreviousIssueLabel(consecutiveWeeks: number) {
  if (consecutiveWeeks <= 1) {
    return "上週未通過";
  }

  return `上週未通過 · 連續低分 ${consecutiveWeeks} 週`;
}
