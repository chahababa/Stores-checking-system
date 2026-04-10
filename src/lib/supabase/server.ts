import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

import { getSupabaseAnonKey, getSupabaseUrl } from "@/lib/supabase/env";
import { Database } from "@/lib/supabase/types";

export async function createClient() {
    const cookieStore = await cookies();

  return createServerClient<Database>(
        getSupabaseUrl(),
        getSupabaseAnonKey(),
    {
            cookies: {
                      getAll() {
                                  return cookieStore.getAll();
                      },
                      setAll(
                                  cookiesToSet: Array<{ name: string; value: string; options?: Parameters<typeof cookieStore.set>[2] }>,
                                ) {
                                  try {
                                                cookiesToSet.forEach(({ name, value, options }) => {
                                                                cookieStore.set(name, value, options);
                                                });
                                  } catch {
                                                // setAll is called from a Server Component where cookies
                                    // cannot be modified. This can safely be ignored because
                                    // middleware.ts will refresh the session on the next request.
                                  }
                      },
            },
    },
      );
}
