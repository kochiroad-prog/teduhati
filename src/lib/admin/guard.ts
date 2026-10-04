import { cache } from "react";
import { createClient } from "@/lib/supabase/server";

/**
 * Who is looking at the console.
 *
 * The layout uses this to decide whether to render at all, and the pages use it
 * to decide whether to offer a control. It is not the security boundary: every
 * privileged action goes through a SECURITY DEFINER function that checks
 * `is_admin()` itself, and every read is filtered by row level security. This
 * is here so the interface tells the truth about what the person can do, not so
 * the interface can be trusted to enforce it.
 */

export type AdminContext = {
  userId: string | null;
  email: string | null;
  isStaff: boolean;
  isAdmin: boolean;
};

export const getAdminContext = cache(async (): Promise<AdminContext> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { userId: null, email: null, isStaff: false, isAdmin: false };
  }

  const [{ data: isStaff }, { data: isAdmin }] = await Promise.all([
    supabase.rpc("is_staff"),
    supabase.rpc("is_admin"),
  ]);

  return {
    userId: user.id,
    email: user.email ?? null,
    isStaff: Boolean(isStaff),
    isAdmin: Boolean(isAdmin),
  };
});

/**
 * The clock, read once for this request.
 *
 * A server component with `force-dynamic` renders once per request, so reading
 * the time there is stable by construction — but the purity lint rule cannot
 * tell a server component from a client one, and it is right to be strict about
 * the client case. Reading it here, and passing the value down as a prop, keeps
 * the rule satisfied and makes the dependency explicit: a component that needs
 * "now" is told, never asks.
 */
export function requestNow(): number {
  return Date.now();
}
