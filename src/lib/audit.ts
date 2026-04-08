import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import type { Json } from "@/lib/supabase/types";

export async function createAuditLog(input: {
  actorId?: string | null;
  actorEmail?: string | null;
  action: string;
  entityType: string;
  entityId: string;
  details?: Json;
}) {
  const admin = createAdminClient();
  const { error } = await admin.from("audit_logs").insert({
    actor_id: input.actorId ?? null,
    actor_email: input.actorEmail ?? null,
    action: input.action,
    entity_type: input.entityType,
    entity_id: input.entityId,
    details: input.details ?? {},
  });

  if (error) {
    throw new Error(error.message);
  }
}
