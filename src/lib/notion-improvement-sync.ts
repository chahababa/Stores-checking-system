import "server-only";

import {
  buildNotionImprovementTaskProperties,
  type NotionImprovementTaskSyncInput,
} from "@/lib/improvement-workflow";

const DEFAULT_IMPROVEMENT_TASKS_DATABASE_ID = "704762e7-5e0b-402f-b672-8c9fe4e2ec0e";
const NOTION_VERSION = "2025-09-03";

type SyncResult =
  | { status: "skipped"; reason: "missing-api-key" | "missing-database-id" }
  | { status: "synced"; pageId: string };

function getNotionConfig() {
  return {
    apiKey: process.env.NOTION_API_KEY,
    databaseId: process.env.NOTION_IMPROVEMENT_TASKS_DATABASE_ID || DEFAULT_IMPROVEMENT_TASKS_DATABASE_ID,
  };
}

async function notionRequest<T>(path: string, init: RequestInit): Promise<T> {
  const { apiKey } = getNotionConfig();
  if (!apiKey) {
    throw new Error("NOTION_API_KEY is not configured.");
  }

  const response = await fetch(`https://api.notion.com/v1${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "Notion-Version": NOTION_VERSION,
      ...init.headers,
    },
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Notion sync failed (${response.status}): ${body}`);
  }

  return (await response.json()) as T;
}

export async function upsertNotionImprovementTask(input: {
  notionPageId?: string | null;
  task: NotionImprovementTaskSyncInput;
}): Promise<SyncResult> {
  const { apiKey, databaseId } = getNotionConfig();
  if (!apiKey) {
    return { status: "skipped", reason: "missing-api-key" };
  }
  if (!databaseId) {
    return { status: "skipped", reason: "missing-database-id" };
  }

  const properties = buildNotionImprovementTaskProperties(input.task);

  if (input.notionPageId) {
    const page = await notionRequest<{ id: string }>(`/pages/${input.notionPageId}`, {
      method: "PATCH",
      body: JSON.stringify({ properties }),
    });
    return { status: "synced", pageId: page.id };
  }

  const page = await notionRequest<{ id: string }>("/pages", {
    method: "POST",
    body: JSON.stringify({
      parent: { database_id: databaseId },
      properties,
    }),
  });

  return { status: "synced", pageId: page.id };
}
