function getRequiredEnv(name: string) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

export function getSupabaseUrl() {
  const value = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!value) {
    throw new Error("Missing required environment variable: NEXT_PUBLIC_SUPABASE_URL");
  }

  return value;
}

export function getSupabaseAnonKey() {
  const value = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!value) {
    throw new Error("Missing required environment variable: NEXT_PUBLIC_SUPABASE_ANON_KEY");
  }

  return value;
}

export function getSupabaseServiceRoleKey() {
  return getRequiredEnv("SUPABASE_SERVICE_ROLE_KEY");
}

export function getSiteUrl() {
  const value = process.env.NEXT_PUBLIC_SITE_URL;
  if (!value) {
    throw new Error("Missing required environment variable: NEXT_PUBLIC_SITE_URL");
  }

  return value;
}

export function getResendApiKey() {
  return process.env.RESEND_API_KEY ?? null;
}

export function getResendFromEmail() {
  return process.env.RESEND_FROM_EMAIL ?? null;
}

export function getReleaseAnnouncementWebhookSecret() {
  return process.env.RELEASE_ANNOUNCEMENT_WEBHOOK_SECRET ?? null;
}
