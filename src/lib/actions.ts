"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { href, isLocale, type Locale } from "@/i18n/config";
import { entitlements } from "@/lib/entitlements";
import type { PlanTier } from "@/types/db";

/**
 * Writes. Each one checks the session, lets RLS enforce ownership, and returns
 * a plain object the form can render. Nothing throws at the user.
 */

export type ActionResult = { ok: true } | { ok: false; message: string };

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
    const [{ data: plan }, { count }] = await Promise.all([
      supabase.rpc("current_plan"),
      supabase
        .from("children")
        .select("id", { count: "exact", head: true })
        .eq("is_archived", false),
    ]);

    const limit = entitlements(((plan as PlanTier | null) ?? "free")).children;
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
export async function sendMagicLink(formData: FormData): Promise<ActionResult> {
  const supabase = await createClient();
  const email = String(formData.get("email") ?? "").trim();
  const loc = locale(formData.get("locale"));
  const next = String(formData.get("next") ?? href(loc, "home"));

  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return {
      ok: false,
      message: loc === "en" ? "Check the email address." : "Periksa alamat emailnya.",
    };
  }

  const origin =
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ?? "http://localhost:3000";

  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: `${origin}/auth/callback?next=${encodeURIComponent(next)}`,
      data: { locale: loc },
    },
  });

  if (error) return { ok: false, message: error.message };
  return { ok: true };
}

export async function signOut(formData: FormData): Promise<void> {
  const supabase = await createClient();
  const loc = locale(formData.get("locale"));
  await supabase.auth.signOut();
  redirect(href(loc, "signIn"));
}
