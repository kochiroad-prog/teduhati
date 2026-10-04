import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { DEFAULT_LOCALE, LOCALES, type Locale } from "@/i18n/config";

// Pages a signed-out visitor may open. Matched against the path *after* the
// locale segment. /pratinjau is the design reference, which only exists outside
// production.
// "/" is the public landing page; everything else under a locale needs a session.
const PUBLIC_PATHS = ["/", "/masuk", "/daftar", "/lupa-sandi", "/tentang", "/pratinjau"];

// Route handlers, not pages: they have no locale segment and must never be
// redirected into one. Email links (sign-up confirmation, password reset) land
// on /auth/callback and the assistant posts to /api/ai/ask; prefixing either
// with a locale turns it into a 404.
const NON_LOCALIZED = ["/api", "/auth"];

function isNonLocalized(pathname: string): boolean {
  return NON_LOCALIZED.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

function pickLocale(request: NextRequest): Locale {
  const fromCookie = request.cookies.get("teduhati_locale")?.value;
  if (fromCookie && (LOCALES as readonly string[]).includes(fromCookie)) {
    return fromCookie as Locale;
  }

  const header = request.headers.get("accept-language") ?? "";
  for (const part of header.split(",")) {
    const tag = part.split(";")[0].trim().slice(0, 2).toLowerCase();
    if ((LOCALES as readonly string[]).includes(tag)) return tag as Locale;
  }

  return DEFAULT_LOCALE;
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Route handlers own their own auth, and a redirect here would drop the POST
  // body or the one-time code in the query string.
  if (isNonLocalized(pathname)) {
    return NextResponse.next();
  }

  // Every page lives under a locale segment. Anything without one is redirected.
  const first = pathname.split("/")[1];
  if (!(LOCALES as readonly string[]).includes(first)) {
    const url = request.nextUrl.clone();
    url.pathname = `/${pickLocale(request)}${pathname === "/" ? "" : pathname}`;
    return NextResponse.redirect(url);
  }

  const locale = first as Locale;
  const rest = pathname.slice(locale.length + 1) || "/";

  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // Refreshing here keeps the session alive for Server Components, which cannot
  // write cookies themselves.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isPublic = PUBLIC_PATHS.some((p) => rest === p || rest.startsWith(`${p}/`));

  if (!user && !isPublic) {
    const url = request.nextUrl.clone();
    url.pathname = `/${locale}/masuk`;
    url.searchParams.set("lanjut", pathname);
    return NextResponse.redirect(url);
  }

  if (user && (rest === "/masuk" || rest === "/daftar" || rest === "/lupa-sandi")) {
    const url = request.nextUrl.clone();
    url.pathname = `/${locale}`;
    url.search = "";
    return NextResponse.redirect(url);
  }

  response.cookies.set("teduhati_locale", locale, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
  });

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icons|manifest.webmanifest|sw.js|.*\\.(?:png|jpg|jpeg|svg|webp|mp3|wav)$).*)"],
};
