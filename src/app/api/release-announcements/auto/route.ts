import { NextResponse } from "next/server";

import { buildAutoReleaseAnnouncement } from "@/lib/auto-release-announcement";
import { createAdminClient } from "@/lib/supabase/admin";
import { getReleaseAnnouncementWebhookSecret } from "@/lib/supabase/env";

type AutoReleasePayload = {
  commitSha: string;
  commitSubject: string;
  commitBody?: string;
  repository?: string;
  commitUrl?: string;
  publishedOn?: string;
};

function getBearerToken(request: Request) {
  const authorization = request.headers.get("authorization") ?? "";
  const match = authorization.match(/^Bearer\s+(.+)$/i);
  return match?.[1] ?? null;
}

function isAuthorized(request: Request) {
  const expectedSecret = getReleaseAnnouncementWebhookSecret();
  if (!expectedSecret) return false;

  const providedSecret = getBearerToken(request) ?? request.headers.get("x-release-announcement-secret");
  return providedSecret === expectedSecret;
}

function isPayload(payload: unknown): payload is AutoReleasePayload {
  if (!payload || typeof payload !== "object") return false;

  const candidate = payload as AutoReleasePayload;
  return typeof candidate.commitSha === "string" && typeof candidate.commitSubject === "string";
}

export async function POST(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "未授權" }, { status: 401 });
  }

  const payload: unknown = await request.json().catch(() => null);
  if (!isPayload(payload)) {
    return NextResponse.json({ error: "缺少 commitSha 或 commitSubject" }, { status: 400 });
  }

  const announcement = buildAutoReleaseAnnouncement({
    commitSha: payload.commitSha,
    commitSubject: payload.commitSubject,
    commitBody: payload.commitBody,
    repository: payload.repository,
    commitUrl: payload.commitUrl,
    publishedOn: payload.publishedOn,
  });

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("release_announcements")
    .upsert(
      {
        title: announcement.title,
        summary: announcement.summary,
        audience: announcement.audience,
        published_on: announcement.publishedOn,
        is_active: announcement.isActive,
        source_type: announcement.sourceType,
        source_ref: announcement.sourceRef,
      },
      { onConflict: "source_type,source_ref" },
    )
    .select("id, title, published_on, source_type, source_ref")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ announcement: data });
}
