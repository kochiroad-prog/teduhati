import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "@/types/db";

/**
 * Request-scoped Supabase client. Reads the session from cookies and refreshes
 * it when needed. Server Components cannot write cookies, so the setter is
 * allowed to fail quietly — middleware has already refreshed the session by the
 * time a page renders.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Called from a Server Component: middleware owns cookie writes.
          }
        },
      },
    },
  );
}

/**
 * Service-role client. Bypasses RLS, so it is only ever constructed inside
 * route handlers that have already checked who is asking — payment webhooks,
 * usage counters, content imports.
 */
export function createAdminClient() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY is not set. Server-side writes cannot run without it.",
    );
  }

  return createServerClient<Database>(process.env.NEXT_PUBLIC_SUPABASE_URL!, key, {
    cookies: { getAll: () => [], setAll: () => {} },
  });
}
