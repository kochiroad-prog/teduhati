"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { href, isLocale, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { entitlementsWith } from "@/lib/entitlements";
import { getSettings } from "@/lib/settings";
import type { PlanTier } from "@/types/db";

/**
 * Writes. Each one checks the session, lets RLS enforce ownership, and returns
 * a plain object the form can render. Nothing throws at the user.
 */

export type ActionResult =
  | { ok: true; needsConfirmation?: boolean }
  | { ok: false; message: string };

function locale(value: FormDataEntryValue | null): Locale {
  const v = typeof value === "string" ? value : "id";
  return isLocale(v) ? v : "id";
}

/* -------------------------------------------------------------------------- */
/* child profile                                                              */
/* -------------------------------------------------------------------------- */
export async function saveChild(formData: FormData): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, message: "Sesi berakhir. Masuk lagi untuk menyimpan." };

  const id = formData.get("id");
  const name = String(formData.get("name") ?? "").trim();
  const birthDate = String(formData.get("birth_date") ?? "");
  const interests = String(formData.get("interests") ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 8);
  const loc = locale(formData.get("locale"));

  if (!name) return { ok: false, message: "Nama anak belum diisi." };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(birthDate)) {
    return { ok: false, message: "Tanggal lahir belum lengkap." };
  }
  if (new Date(birthDate) > new Date()) {
    return { ok: false, message: "Tanggal lahir tidak boleh di masa depan." };
  }

  if (typeof id === "string" && id) {
    const { error } = await supabase
      .from("children")
      .update({ name, birth_date: birthDate, interests })
      .eq("id", id);
    if (error) return { ok: false, message: error.message };
  } else {
    // The plan caps how many children a parent can add.
    const [{ data: plan }, { count }, settings] = await Promise.all([
      supabase.rpc("current_plan"),
      supabase
        .from("children")
        .select("id", { count: "exact", head: true })
        .eq("is_archived", false),
      getSettings(),
    ]);

    const limit = entitlementsWith(
      (plan as PlanTier | null) ?? "free",
      settings.free,
    ).children;
    if ((count ?? 0) >= limit) {
      return {
        ok: false,
        message:
          loc === "en"
            ? `Your plan covers ${limit} ${limit === 1 ? "child" : "children"}.`
            : `Paket Anda mencakup ${limit} anak.`,
      };
    }

    const { error } = await supabase.from("children").insert({
      user_id: user.id,
      name,
      birth_date: birthDate,
      interests,
    });
    if (error) return { ok: false, message: error.message };

    await supabase
      .from("profiles")
      .update({ onboarded_at: new Date().toISOString() })
      .eq("id", user.id);
  }

  revalidatePath(`/${loc}`, "layout");
  redirect(href(loc, "home"));
}

/* -------------------------------------------------------------------------- */
/* activity completion                                                        */
/* -------------------------------------------------------------------------- */
export async function completeActivity(formData: FormData): Promise<ActionResult> {
  const supabase = await createClient();

  const childId = String(formData.get("child_id") ?? "");
  const activityId = String(formData.get("activity_id") ?? "");
  const moodRaw = String(formData.get("mood") ?? "");
  const mood = ["loved_it", "okay", "not_today"].includes(moodRaw) ? moodRaw : null;
  const minutes = Number(formData.get("actual_minutes"));
  const loc = locale(formData.get("locale"));

  if (!childId || !activityId) {
    return { ok: false, message: "Aktivitas tidak dikenali." };
  }

  const { error } = await supabase.from("activity_completions").insert({
    child_id: childId,
    activity_id: activityId,
    child_mood: mood as "loved_it" | "okay" | "not_today" | null,
    actual_minutes: Number.isFinite(minutes) && minutes > 0 ? minutes : null,
  });

  if (error) return { ok: false, message: error.message };

  revalidatePath(`/${loc}`, "layout");
  redirect(`${href(loc, "garden")}?selesai=${activityId}`);
}

/* -------------------------------------------------------------------------- */
/* bonding moment                                                             */
/* -------------------------------------------------------------------------- */
export async function logBonding(formData: FormData): Promise<ActionResult> {
  const supabase = await createClient();

  const childId = String(formData.get("child_id") ?? "");
  const momentId = String(formData.get("bonding_moment_id") ?? "");
  const loc = locale(formData.get("locale"));

  if (!childId || !momentId) return { ok: false, message: "Momen tidak dikenali." };

  const { error } = await supabase
    .from("bonding_completions")
    .insert({ child_id: childId, bonding_moment_id: momentId });

  if (error) return { ok: false, message: error.message };

  revalidatePath(`/${loc}`, "layout");
  return { ok: true };
}

/* -------------------------------------------------------------------------- */
/* auth                                                                       */
/* -------------------------------------------------------------------------- */
/**
 * Where email links come back to. NEXT_PUBLIC_SITE_URL is authoritative when it
 * is set; otherwise the request's own host is used, which keeps preview
 * deployments working without a per-environment variable.
 */
async function siteOrigin(): Promise<string> {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "");
  if (configured) return configured;

  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  if (!host) return "http://localhost:3000";
  const protocol = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${protocol}://${host}`;
}

function isEmail(value: string): boolean {
  return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(value);
}

export async function signIn(formData: FormData): Promise<ActionResult> {
  const supabase = await createClient();
  const loc = locale(formData.get("locale"));
  const dict = getDictionary(loc);
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const next = String(formData.get("next") ?? href(loc, "home"));

  if (!isEmail(email)) return { ok: false, message: dict.auth.errorEmail };
  if (!password) return { ok: false, message: dict.auth.errorBadCredentials };

  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    // Supabase distinguishes these two, and the difference matters to the reader:
    // one means "try again", the other means "go and click the email".
    const message = /not confirmed/i.test(error.message)
      ? dict.auth.errorNotConfirmed
      : dict.auth.errorBadCredentials;
    return { ok: false, message };
  }

  revalidatePath(`/${loc}`, "layout");
  redirect(next.startsWith("/") ? next : href(loc, "home"));
}

export async function signUp(formData: FormData): Promise<ActionResult> {
  const supabase = await createClient();
  const loc = locale(formData.get("locale"));
  const dict = getDictionary(loc);
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const displayName = String(formData.get("display_name") ?? "").trim();

  if (!isEmail(email)) return { ok: false, message: dict.auth.errorEmail };
  if (password.length < 8) return { ok: false, message: dict.auth.errorPasswordShort };

  const origin = await siteOrigin();

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${origin}/auth/callback?next=${encodeURIComponent(href(loc, "child"))}`,
      data: { locale: loc, display_name: displayName || null },
    },
  });

  if (error) {
    const message = /already registered|already exists/i.test(error.message)
      ? dict.auth.errorExists
      : error.message;
    return { ok: false, message };
  }

  // With email confirmation on, signUp returns a user but no session. The caller
  // shows "check your email" rather than pretending the account is ready.
  if (!data.session) return { ok: true, needsConfirmation: true };

  revalidatePath(`/${loc}`, "layout");
  redirect(href(loc, "child"));
}

export async function requestPasswordReset(formData: FormData): Promise<ActionResult> {
  const supabase = await createClient();
  const loc = locale(formData.get("locale"));
  const dict = getDictionary(loc);
  const email = String(formData.get("email") ?? "").trim();

  if (!isEmail(email)) return { ok: false, message: dict.auth.errorEmail };

  const origin = await siteOrigin();

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${origin}/auth/callback?next=${encodeURIComponent(href(loc, "newPassword"))}`,
  });

  // A failure here would tell a stranger whether an address has an account, so
  // the caller always shows the same "check your email" screen.
  if (error) console.error("resetPasswordForEmail failed", error.message);
  return { ok: true };
}

export async function updatePassword(formData: FormData): Promise<ActionResult> {
  const supabase = await createClient();
  const loc = locale(formData.get("locale"));
  const dict = getDictionary(loc);
  const password = String(formData.get("password") ?? "");

  if (password.length < 8) return { ok: false, message: dict.auth.errorPasswordShort };

  const { error } = await supabase.auth.updateUser({ password });
  if (error) return { ok: false, message: error.message };

  revalidatePath(`/${loc}`, "layout");
  redirect(href(loc, "home"));
}

export async function signOut(formData: FormData): Promise<void> {
  const supabase = await createClient();
  const loc = locale(formData.get("locale"));
  await supabase.auth.signOut();
  redirect(href(loc, "signIn"));
}
