import { createBrowserClient } from "@supabase/ssr";

import { getSupabaseAnonKey, getSupabaseUrl } from "@/lib/supabase/env";
import { Database } from "@/lib/supabase/types";

export function createClient() {
  return createBrowserClient<Database>(getSupabaseUrl(), getSupabaseAnonKey());
}
