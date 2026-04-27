import "server-only";

import { Resend } from "resend";

import { buildOverallInspectionGrade, type GradeableScore, type InspectionGrade } from "@/lib/grading";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  getResendApiKey,
  getResendFromEmail,
  getSiteUrl,
} from "@/lib/supabase/env";

type LowScoreEntry = {
  categoryName: string;
  itemName: string;
  grade: "B" | "C";
  note: string;
};

type ResolvedSingle<T> = T | T[] | null | undefined;

function pickSingle<T>(value: ResolvedSingle<T>): T | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export type SendInspectionEmailResult =
  | { ok: true; recipientCount: number; messageId: string | null }
  | { ok: false; reason: "config_missing" | "no_recipients" | "send_failed" | "fetch_failed"; error?: string };

/**
 * Sends an inspection-completion notification to:
 *   - the leader of the affected store
 *   - all active managers
 *   - all active owners
 *
 * Designed to never throw — callers should check the returned result and log
 * failures via audit log, but never fail the parent transaction (e.g. the
 * createInspection server action) on email problems.
 */
export async function sendInspectionCompletedEmail(inspectionId: string): Promise<SendInspectionEmailResult> {
  const apiKey = getResendApiKey();
  const fromEmail = getResendFromEmail();
  if (!apiKey || !fromEmail) {
    return { ok: false, reason: "config_missing" };
  }

  const admin = createAdminClient();

  try {
    const { data: inspectionRow, error: inspectionError } = await admin
      .from("inspections")
      .select(
        "id, date, time_slot, total_score, store_id, stores(id, name), users(id, email, name)",
      )
      .eq("id", inspectionId)
      .maybeSingle();

    if (inspectionError || !inspectionRow) {
      return { ok: false, reason: "fetch_failed", error: inspectionError?.message ?? "inspection not found" };
    }

    const store = pickSingle(inspectionRow.stores) as { id: string; name: string } | null;
    const inspector = pickSingle(inspectionRow.users) as { email: string; name: string | null } | null;

    if (!store) {
      return { ok: false, reason: "fetch_failed", error: "store missing" };
    }

    const { data: scoreRows, error: scoreError } = await admin
      .from("inspection_scores")
      .select("score, note, applied_tag_types, inspection_items(name, categories(name))")
      .eq("inspection_id", inspectionId);

    if (scoreError) {
      return { ok: false, reason: "fetch_failed", error: scoreError.message };
    }

    const grading: GradeableScore[] = (scoreRows ?? []).map((row) => {
      const item = pickSingle(row.inspection_items) as { name?: string; categories?: unknown } | null;
      const category = item ? (pickSingle(item.categories as never) as { name?: string } | null) : null;
      return {
        categoryName: category?.name ?? "未分類",
        score: row.score,
        tagTypes: row.applied_tag_types ?? [],
      };
    });

    const overall = buildOverallInspectionGrade(grading);

    const lowScoreEntries: LowScoreEntry[] = (scoreRows ?? [])
      .filter((row) => row.score <= 2)
      .map((row) => {
        const item = pickSingle(row.inspection_items) as { name?: string; categories?: unknown } | null;
        const category = item ? (pickSingle(item.categories as never) as { name?: string } | null) : null;
        return {
          categoryName: category?.name ?? "未分類",
          itemName: item?.name ?? "(未命名題目)",
          grade: row.score === 1 ? "C" : "B",
          note: (row.note ?? "").trim(),
        };
      });

    const bCount = lowScoreEntries.filter((entry) => entry.grade === "B").length;
    const cCount = lowScoreEntries.filter((entry) => entry.grade === "C").length;

    const { data: recipientRows, error: recipientError } = await admin
      .from("users")
      .select("email, role, store_id")
      .eq("is_active", true)
      .or(
        `role.eq.owner,role.eq.manager,and(role.eq.leader,store_id.eq.${store.id})`,
      );

    if (recipientError) {
      return { ok: false, reason: "fetch_failed", error: recipientError.message };
    }

    const recipientEmails = Array.from(
      new Set(
        (recipientRows ?? [])
          .map((row) => row.email?.trim().toLowerCase())
          .filter((email): email is string => Boolean(email)),
      ),
    );

    if (recipientEmails.length === 0) {
      return { ok: false, reason: "no_recipients" };
    }

    const inspectionUrl = `${getSiteUrl().replace(/\/$/, "")}/inspection/history/${inspectionRow.id}`;
    const inspectorLabel = inspector?.name ? `${inspector.name}（${inspector.email}）` : inspector?.email ?? "不明";
    const subject = `[巡店通知] ${store.name} ${inspectionRow.date} ${inspectionRow.time_slot} — 總評 ${overall.finalGrade}`;
    const averageDisplay = Number(inspectionRow.total_score ?? 0).toFixed(2);

    const text = buildPlainText({
      storeName: store.name,
      date: inspectionRow.date,
      timeSlot: inspectionRow.time_slot,
      grade: overall.finalGrade,
      average: averageDisplay,
      bCount,
      cCount,
      inspectorLabel,
      lowScoreEntries,
      inspectionUrl,
    });

    const html = buildHtml({
      storeName: store.name,
      date: inspectionRow.date,
      timeSlot: inspectionRow.time_slot,
      grade: overall.finalGrade,
      average: averageDisplay,
      bCount,
      cCount,
      inspectorLabel,
      lowScoreEntries,
      inspectionUrl,
    });

    const resend = new Resend(apiKey);
    const { data: sendData, error: sendError } = await resend.emails.send({
      from: fromEmail,
      // Send via BCC so recipients don't see each other's addresses.
      to: fromEmail,
      bcc: recipientEmails,
      subject,
      html,
      text,
    });

    if (sendError) {
      return { ok: false, reason: "send_failed", error: sendError.message };
    }

    return { ok: true, recipientCount: recipientEmails.length, messageId: sendData?.id ?? null };
  } catch (error) {
    return {
      ok: false,
      reason: "send_failed",
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

type BuildArgs = {
  storeName: string;
  date: string;
  timeSlot: string;
  grade: InspectionGrade;
  average: string;
  bCount: number;
  cCount: number;
  inspectorLabel: string;
  lowScoreEntries: LowScoreEntry[];
  inspectionUrl: string;
};

function buildPlainText(args: BuildArgs) {
  const lines = [
    `${args.storeName} 已完成 ${args.date} ${args.timeSlot} 的巡店。`,
    "",
    `提交者：${args.inspectorLabel}`,
    `總評：${args.grade}`,
    `平均分數：${args.average}`,
    `B 題目：${args.bCount} 題`,
    `C 題目：${args.cCount} 題`,
    "",
  ];

  if (args.lowScoreEntries.length > 0) {
    lines.push("【需要追蹤的題目】");
    for (const entry of args.lowScoreEntries) {
      lines.push(`- [${entry.grade}] ${entry.categoryName} / ${entry.itemName}`);
      if (entry.note) {
        lines.push(`    備註：${entry.note}`);
      }
    }
    lines.push("");
  } else {
    lines.push("本次巡店沒有 B 或 C 題目。");
    lines.push("");
  }

  lines.push("查看完整報告：");
  lines.push(args.inspectionUrl);
  lines.push("");
  lines.push("（此為系統自動通知，請勿回覆）");
  return lines.join("\n");
}

function buildHtml(args: BuildArgs) {
  const gradeColor = args.grade === "A" ? "#16a34a" : args.grade === "B" ? "#ca8a04" : "#dc2626";

  const lowScoreSection =
    args.lowScoreEntries.length > 0
      ? `
        <h3 style="margin: 24px 0 8px; font-size: 16px; color: #111;">需要追蹤的題目</h3>
        <ul style="padding-left: 20px; margin: 0; color: #111; font-size: 14px; line-height: 1.6;">
          ${args.lowScoreEntries
            .map(
              (entry) => `
            <li style="margin-bottom: 8px;">
              <span style="display: inline-block; min-width: 26px; padding: 2px 6px; margin-right: 6px; border-radius: 4px; background: ${entry.grade === "C" ? "#fee2e2" : "#fef3c7"}; color: ${entry.grade === "C" ? "#991b1b" : "#854d0e"}; font-weight: 700; text-align: center;">${entry.grade}</span>
              <strong>${escapeHtml(entry.categoryName)}</strong> / ${escapeHtml(entry.itemName)}
              ${entry.note ? `<div style="margin-top: 4px; padding-left: 32px; color: #555; font-size: 13px;">備註：${escapeHtml(entry.note)}</div>` : ""}
            </li>`,
            )
            .join("")}
        </ul>
      `
      : `<p style="margin: 16px 0; color: #16a34a; font-size: 14px;">本次巡店沒有 B 或 C 題目。</p>`;

  return `<!DOCTYPE html>
<html lang="zh-Hant">
<body style="margin: 0; padding: 24px; background: #f5f5f4; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: #111;">
  <div style="max-width: 640px; margin: 0 auto; background: #fff; padding: 28px; border-radius: 12px; border: 1px solid #e5e5e5;">
    <p style="margin: 0; color: #888; font-size: 12px; letter-spacing: 0.12em; text-transform: uppercase;">Inspection Completed</p>
    <h2 style="margin: 6px 0 18px; font-size: 22px;">${escapeHtml(args.storeName)} 巡店通知</h2>

    <table style="width: 100%; border-collapse: collapse; font-size: 14px; line-height: 1.6;">
      <tr><td style="color: #555; padding: 4px 12px 4px 0; width: 96px;">店別</td><td>${escapeHtml(args.storeName)}</td></tr>
      <tr><td style="color: #555; padding: 4px 12px 4px 0;">日期</td><td>${escapeHtml(args.date)}</td></tr>
      <tr><td style="color: #555; padding: 4px 12px 4px 0;">時段</td><td>${escapeHtml(args.timeSlot)}</td></tr>
      <tr><td style="color: #555; padding: 4px 12px 4px 0;">提交者</td><td>${escapeHtml(args.inspectorLabel)}</td></tr>
      <tr><td style="color: #555; padding: 4px 12px 4px 0;">總評</td><td><strong style="color: ${gradeColor}; font-size: 18px;">${args.grade}</strong> <span style="color: #888;">（平均 ${args.average}）</span></td></tr>
      <tr><td style="color: #555; padding: 4px 12px 4px 0;">B / C 題目</td><td>B <strong>${args.bCount}</strong> 題 · C <strong>${args.cCount}</strong> 題</td></tr>
    </table>

    ${lowScoreSection}

    <div style="margin: 28px 0 8px;">
      <a href="${args.inspectionUrl}" style="display: inline-block; padding: 10px 18px; background: #111; color: #fff; text-decoration: none; border-radius: 6px; font-weight: 700;">查看完整報告</a>
    </div>
    <p style="margin: 6px 0 0; font-size: 12px; color: #888; word-break: break-all;">${args.inspectionUrl}</p>

    <hr style="margin: 24px 0; border: 0; border-top: 1px solid #eee;" />
    <p style="margin: 0; font-size: 12px; color: #999;">此為系統自動通知，請勿回覆。</p>
  </div>
</body>
</html>`;
}
