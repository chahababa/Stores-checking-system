import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { getSiteUrl } from "@/lib/supabase/env";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const siteUrl = getSiteUrl();

  if (!code) {
    return NextResponse.redirect(`${siteUrl}/login`);
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(`${siteUrl}/forbidden?reason=oauth`);
  }

  return NextResponse.redirect(`${siteUrl}/`);
}
