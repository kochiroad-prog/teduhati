import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Magic-link landing. Exchanges the code for a session, then sends the parent
 * where they were originally heading.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/id";

  if (!code) {
    return NextResponse.redirect(`${origin}/id/masuk?tautan=tidak-valid`);
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(`${origin}/id/masuk?tautan=tidak-valid`);
  }

  // Only ever redirect to a path on this origin.
  const safeNext = next.startsWith("/") ? next : "/id";
  return NextResponse.redirect(`${origin}${safeNext}`);
}
