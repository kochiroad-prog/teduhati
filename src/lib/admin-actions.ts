"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isLocale, type Locale } from "@/i18n/config";
import { adminHref } from "@/lib/admin/routes";
import type { ContentStatus, Json, PlanTier, UserRole } from "@/types/db";

/**
 * Everything the console writes.
 *
 * Two rules hold throughout. First, nothing here is the security boundary: each
 * of these calls either goes through a SECURITY DEFINER function that checks the
 * caller's role in Postgres, or through a table protected by row level security.
 * An editor who crafts a request by hand gets the same refusal the interface
 * would have given them.
 *
 * Second, a publish is never forced. `set_content_status` returns the list of
 * problems instead of raising, so the editor reads exactly what the database
 * objected to rather than a constraint error.
 */

export type AdminResult =
  | { ok: true; message?: string }
  | { ok: false; message: string; problems?: string[] };

function loc(value: FormDataEntryValue | null): Locale {
  const v = typeof value === "string" ? value : "id";
  return isLocale(v) ? v : "id";
}

function text(form: FormData, key: string, max = 4000): string {
  return String(form.get(key) ?? "")
    .replace(/\r\n/g, "\n")
    .trim()
    .slice(0, max);
}

function optional(form: FormData, key: string, max = 4000): string | null {
  const value = text(form, key, max);
  return value === "" ? null : value;
}

function int(form: FormData, key: string, fallback: number): number {
  const n = Number.parseInt(String(form.get(key) ?? ""), 10);
  return Number.isFinite(n) ? n : fallback;
}

function flag(form: FormData, key: string): boolean {
  return form.get(key) === "on" || form.get(key) === "true";
}

function list(form: FormData, key: string): string[] {
  return form
    .getAll(key)
    .map((v) => String(v).trim())
    .filter(Boolean);
}

/**
 * An enum field, narrowed against the values the column actually accepts.
 *
 * A cast would compile and then fail in Postgres; this turns a tampered form
 * value into the fallback instead, which for an optional column means null.
 */
function oneOf<T extends string>(
  form: FormData,
  key: string,
  allowed: readonly T[],
  fallback: T,
): T {
  const v = String(form.get(key) ?? "");
  return (allowed as readonly string[]).includes(v) ? (v as T) : fallback;
}

function oneOfOrNull<T extends string>(
  form: FormData,
  key: string,
  allowed: readonly T[],
): T | null {
  const v = String(form.get(key) ?? "");
  return (allowed as readonly string[]).includes(v) ? (v as T) : null;
}

const MUSIC_MODES = ["morning", "play", "bonding", "bedtime"] as const;
const MOMENT_TYPES = [
  "morning",
  "play",
  "meal",
  "bath",
  "outdoor",
  "bedtime",
  "anytime",
] as const;
const AUDIO_KINDS = ["music", "sfx", "signature"] as const;

/** A textarea where one line is one entry. Blank lines are not entries. */
function lines(form: FormData, key: string): string[] {
  return text(form, key, 8000)
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
}

/**
 * Steps come out of a form whose row count the editor controls, so they are
 * read by index up to the count the client reported, and empty rows are dropped
 * rather than saved as blank steps.
 */
function steps(form: FormData, locale: string): { title: string; body: string }[] {
  const count = int(form, "step_count", 0);
  const out: { title: string; body: string }[] = [];
  for (let i = 0; i < Math.min(count, 30); i++) {
    const title = text(form, `step_title_${locale}_${i}`, 200);
    const body = text(form, `step_body_${locale}_${i}`, 2000);
    if (title || body) out.push({ title, body });
  }
  return out;
}

function pages(form: FormData, locale: string): { text: string; speaker?: string }[] {
  const count = int(form, "page_count", 0);
  const out: { text: string; speaker?: string }[] = [];
  for (let i = 0; i < Math.min(count, 60); i++) {
    const body = text(form, `page_text_${locale}_${i}`, 2000);
    const speaker = text(form, `page_speaker_${locale}_${i}`, 80);
    if (body) out.push(speaker ? { text: body, speaker } : { text: body });
  }
  return out;
}

/* ==========================================================================
   content — activities
   ========================================================================== */
export async function saveActivity(form: FormData): Promise<AdminResult> {
  const supabase = await createClient();
  const locale = loc(form.get("locale"));
  const isNew = form.get("is_new") === "1";

  let id = text(form, "id", 12).toUpperCase();
  if (isNew) {
    const { data: nextId, error: idError } = await supabase.rpc("next_content_id", {
      p_table: "activities",
    });
    if (idError || !nextId) {
      return { ok: false, message: idError?.message ?? "Could not allocate an id." };
    }
    id = nextId;
  }
  if (!/^ACT-\d{4}$/.test(id)) {
    return { ok: false, message: `"${id}" is not an activity id.` };
  }

  const materials = list(form, "materials");

  const row = {
    id,
    age_min_months: int(form, "age_min_months", 0),
    age_max_months: int(form, "age_max_months", 6),
    age_band_code: text(form, "age_band_code", 16),
    primary_domain: text(form, "primary_domain", 40),
    secondary_domains: list(form, "secondary_domains"),
    skill_codes: list(form, "skill_codes"),
    duration_minutes: int(form, "duration_minutes", 10),
    difficulty: int(form, "difficulty", 1),
    materials,
    // Kept consistent here rather than trusting a checkbox the editor may have
    // forgotten: the two fields describe the same fact.
    no_materials: materials.length === 0,
    screen_free: flag(form, "screen_free"),
    needs_supervision: flag(form, "needs_supervision"),
    bonding_level: int(form, "bonding_level", 2),
    music_mode: oneOfOrNull(form, "music_mode", MUSIC_MODES),
    illustration_path: optional(form, "illustration_path", 300),
    is_premium: flag(form, "is_premium"),
    reviewed_by_expert: flag(form, "reviewed_by_expert"),
  };

  const { error: upsertError } = await supabase.from("activities").upsert(row);
  if (upsertError) return { ok: false, message: upsertError.message };

  const translations = (["id", "en"] as const).map((l) => ({
    activity_id: id,
    locale: l,
    title: text(form, `title_${l}`, 200),
    summary: text(form, `summary_${l}`, 600),
    learning_goal: text(form, `learning_goal_${l}`, 600),
    steps: steps(form, l) as unknown as Json,
    parent_tip: optional(form, `parent_tip_${l}`, 600),
    safety_notes: optional(form, `safety_notes_${l}`, 600),
    variations: lines(form, `variations_${l}`),
    materials_text: optional(form, `materials_text_${l}`, 400),
  }));

  const { error: trError } = await supabase
    .from("activity_translations")
    .upsert(translations);
  if (trError) return { ok: false, message: trError.message };

  revalidatePath(`/${locale}/admin`, "layout");

  if (isNew) redirect(adminHref(locale, "activities", id));
  return { ok: true };
}

/* ==========================================================================
   content — stories
   ========================================================================== */
export async function saveStory(form: FormData): Promise<AdminResult> {
  const supabase = await createClient();
  const locale = loc(form.get("locale"));
  const isNew = form.get("is_new") === "1";

  let id = text(form, "id", 12).toUpperCase();
  if (isNew) {
    const { data: nextId, error } = await supabase.rpc("next_content_id", {
      p_table: "stories",
    });
    if (error || !nextId) return { ok: false, message: error?.message ?? "No id." };
    id = nextId;
  }
  if (!/^STR-\d{4}$/.test(id)) {
    return { ok: false, message: `"${id}" is not a story id.` };
  }

  const { error: upsertError } = await supabase.from("stories").upsert({
    id,
    age_min_months: int(form, "age_min_months", 12),
    age_max_months: int(form, "age_max_months", 60),
    theme: text(form, "theme", 60),
    is_interactive: flag(form, "is_interactive"),
    reading_minutes: int(form, "reading_minutes", 4),
    music_mode: oneOfOrNull(form, "music_mode", MUSIC_MODES),
    cover_path: optional(form, "cover_path", 300),
    is_premium: flag(form, "is_premium"),
  });
  if (upsertError) return { ok: false, message: upsertError.message };

  const translations = (["id", "en"] as const).map((l) => ({
    story_id: id,
    locale: l,
    title: text(form, `title_${l}`, 200),
    blurb: text(form, `blurb_${l}`, 600),
    pages: pages(form, l) as unknown as Json,
  }));

  const { error: trError } = await supabase.from("story_translations").upsert(translations);
  if (trError) return { ok: false, message: trError.message };

  revalidatePath(`/${locale}/admin`, "layout");
  if (isNew) redirect(adminHref(locale, "stories", id));
  return { ok: true };
}

/* ==========================================================================
   content — bonding moments
   ========================================================================== */
export async function saveBonding(form: FormData): Promise<AdminResult> {
  const supabase = await createClient();
  const locale = loc(form.get("locale"));
  const isNew = form.get("is_new") === "1";

  let id = text(form, "id", 12).toUpperCase();
  if (isNew) {
    const { data: nextId, error } = await supabase.rpc("next_content_id", {
      p_table: "bonding_moments",
    });
    if (error || !nextId) return { ok: false, message: error?.message ?? "No id." };
    id = nextId;
  }
  if (!/^BND-\d{4}$/.test(id)) {
    return { ok: false, message: `"${id}" is not a bonding moment id.` };
  }

  const { error: upsertError } = await supabase.from("bonding_moments").upsert({
    id,
    age_min_months: int(form, "age_min_months", 0),
    age_max_months: int(form, "age_max_months", 60),
    moment_type: oneOf(form, "moment_type", MOMENT_TYPES, "anytime"),
    duration_minutes: int(form, "duration_minutes", 2),
    music_mode: oneOfOrNull(form, "music_mode", MUSIC_MODES),
    is_premium: flag(form, "is_premium"),
    sort_order: int(form, "sort_order", 0),
  });
  if (upsertError) return { ok: false, message: upsertError.message };

  const translations = (["id", "en"] as const).map((l) => ({
    bonding_moment_id: id,
    locale: l,
    title: text(form, `title_${l}`, 200),
    prompt: text(form, `prompt_${l}`, 220),
    why_it_matters: text(form, `why_it_matters_${l}`, 600),
  }));

  const { error: trError } = await supabase
    .from("bonding_moment_translations")
    .upsert(translations);
  if (trError) return { ok: false, message: trError.message };

  revalidatePath(`/${locale}/admin`, "layout");
  if (isNew) redirect(adminHref(locale, "bonding", id));
  return { ok: true };
}

/* ==========================================================================
   content — status and duplication
   ========================================================================== */
const CONTENT_TABLES = ["activities", "stories", "bonding_moments", "worksheets"] as const;
type ContentTable = (typeof CONTENT_TABLES)[number];

function contentTable(value: FormDataEntryValue | null): ContentTable | null {
  const v = String(value ?? "");
  return (CONTENT_TABLES as readonly string[]).includes(v) ? (v as ContentTable) : null;
}

export async function setContentStatus(form: FormData): Promise<AdminResult> {
  const supabase = await createClient();
  const locale = loc(form.get("locale"));
  const table = contentTable(form.get("table"));
  const id = text(form, "id", 12);
  const status = String(form.get("status") ?? "") as ContentStatus;

  if (!table) return { ok: false, message: "Unknown content type." };
  if (!["draft", "review", "published", "retired"].includes(status)) {
    return { ok: false, message: "Unknown status." };
  }

  const { data, error } = await supabase.rpc("set_content_status", {
    p_table: table,
    p_id: id,
    p_status: status,
  });

  if (error) return { ok: false, message: error.message };

  const problems = (data ?? []) as string[];
  if (problems.length > 0) {
    return {
      ok: false,
      message:
        locale === "en"
          ? "This cannot be published yet."
          : "Ini belum bisa ditayangkan.",
      problems,
    };
  }

  revalidatePath(`/${locale}/admin`, "layout");
  return { ok: true };
}

/**
 * Copies a row and its translations into a new draft.
 *
 * The copy is always a draft, never published: duplicating is how an editor
 * starts from something that works, and a half-edited copy must not reach a
 * parent in the meantime.
 */
export async function duplicateContent(form: FormData): Promise<AdminResult> {
  const supabase = await createClient();
  const locale = loc(form.get("locale"));
  const table = contentTable(form.get("table"));
  const id = text(form, "id", 12);
  if (!table || table === "worksheets") {
    return { ok: false, message: "Unknown content type." };
  }

  const { data: nextId, error: idError } = await supabase.rpc("next_content_id", {
    p_table: table,
  });
  if (idError || !nextId) {
    return { ok: false, message: idError?.message ?? "Could not allocate an id." };
  }

  const { data: source, error: readError } = await supabase
    .from(table)
    .select("*")
    .eq("id", id)
    .single();
  if (readError || !source) {
    return { ok: false, message: readError?.message ?? "Original not found." };
  }

  const copy = { ...(source as Record<string, unknown>) };
  copy.id = nextId;
  copy.status = "draft";
  delete copy.created_at;
  delete copy.updated_at;

  const { error: insertError } = await supabase
    .from(table)
    // The shape is the table's own row, read back a moment ago.
    .insert(copy as never);
  if (insertError) return { ok: false, message: insertError.message };

  const trTable = {
    activities: "activity_translations",
    stories: "story_translations",
    bonding_moments: "bonding_moment_translations",
  }[table] as
    | "activity_translations"
    | "story_translations"
    | "bonding_moment_translations";

  const fk = {
    activities: "activity_id",
    stories: "story_id",
    bonding_moments: "bonding_moment_id",
  }[table];

  const { data: trRows } = await supabase.from(trTable).select("*").eq(fk, id);
  if (trRows && trRows.length > 0) {
    const copies = trRows.map((r) => ({ ...(r as Record<string, unknown>), [fk]: nextId }));
    const { error } = await supabase.from(trTable).insert(copies as never);
    if (error) return { ok: false, message: error.message };
  }

  revalidatePath(`/${locale}/admin`, "layout");

  const route = { activities: "activities", stories: "stories", bonding_moments: "bonding" } as const;
  redirect(adminHref(locale, route[table], nextId));
}

/* ==========================================================================
   content — audio
   ========================================================================== */
export async function saveAudioTrack(form: FormData): Promise<AdminResult> {
  const supabase = await createClient();
  const locale = loc(form.get("locale"));
  const id = text(form, "id", 40);

  const row = {
    ...(id ? { id } : {}),
    kind: oneOf(form, "kind", AUDIO_KINDS, "music"),
    mode: oneOfOrNull(form, "mode", MUSIC_MODES),
    title: text(form, "title", 200),
    bpm_min: form.get("bpm_min") ? int(form, "bpm_min", 0) : null,
    bpm_max: form.get("bpm_max") ? int(form, "bpm_max", 0) : null,
    duration_seconds: form.get("duration_seconds") ? int(form, "duration_seconds", 0) : null,
    instruments: lines(form, "instruments"),
    file_path: optional(form, "file_path", 300),
    is_loop: flag(form, "is_loop"),
    is_premium: flag(form, "is_premium"),
    license_note: optional(form, "license_note", 300),
    sort_order: int(form, "sort_order", 0),
  };

  const { error } = await supabase.from("audio_tracks").upsert(row);
  if (error) return { ok: false, message: error.message };

  revalidatePath(`/${locale}/admin`, "layout");
  return { ok: true };
}

/**
 * Records where an uploaded audio file landed.
 *
 * The bytes never reach this function. They go from the browser straight into
 * the bucket (see `src/lib/admin/upload.ts`), because a server action's request
 * body is capped at 1MB by Next.js and an MP3 is comfortably larger — the first
 * version of this pushed the whole file through here and was rejected by the
 * framework before any of it ran.
 *
 * The path is still checked rather than trusted: a client could post any string,
 * and `file_path` decides what the player fetches.
 */
export async function recordAudioFile(form: FormData): Promise<AdminResult> {
  const supabase = await createClient();
  const locale = loc(form.get("locale"));
  const id = text(form, "id", 40);
  const path = text(form, "path", 300);
  const bytes = int(form, "bytes", 0);

  if (!/^[A-Za-z0-9._-]+\.(mp3|ogg)$/.test(path)) {
    return { ok: false, message: `"${path}" is not an audio file name.` };
  }
  // The uploader names the object after the track, so anything else means the
  // form and the row have drifted apart.
  if (!path.startsWith(`${id}.`)) {
    return { ok: false, message: "That file does not belong to this track." };
  }

  const { error } = await supabase
    .from("audio_tracks")
    .update({ file_path: path })
    .eq("id", id);
  if (error) return { ok: false, message: error.message };

  await supabase.rpc("log_audit", {
    p_action: "audio.upload",
    p_object_type: "audio_tracks",
    p_object_id: id,
    p_summary: `${path} (${Math.round(bytes / 1024)} KB)`,
  });

  revalidatePath(`/${locale}/admin`, "layout");
  return { ok: true };
}

/* ==========================================================================
   people
   ========================================================================== */
export async function setUserRole(form: FormData): Promise<AdminResult> {
  const supabase = await createClient();
  const locale = loc(form.get("locale"));
  const userId = text(form, "user_id", 40);
  const role = String(form.get("role") ?? "") as UserRole;

  if (!["parent", "editor", "admin"].includes(role)) {
    return { ok: false, message: "Unknown role." };
  }

  const { error } = await supabase.rpc("set_user_role", {
    p_user_id: userId,
    p_role: role,
  });
  if (error) return { ok: false, message: error.message };

  revalidatePath(`/${locale}/admin`, "layout");
  return { ok: true };
}

export async function grantPremium(form: FormData): Promise<AdminResult> {
  const supabase = await createClient();
  const locale = loc(form.get("locale"));
  const userId = text(form, "user_id", 40);
  const plan = String(form.get("plan") ?? "premium") as PlanTier;
  const months = int(form, "months", 1);

  const { error } = await supabase.rpc("grant_premium", {
    p_user_id: userId,
    p_plan: plan,
    p_months: months,
    p_note: optional(form, "note", 300),
  });
  if (error) return { ok: false, message: error.message };

  revalidatePath(`/${locale}/admin`, "layout");
  return { ok: true };
}

export async function cancelSubscription(form: FormData): Promise<AdminResult> {
  const supabase = await createClient();
  const locale = loc(form.get("locale"));

  const { error } = await supabase.rpc("cancel_subscription", {
    p_subscription_id: text(form, "subscription_id", 40),
    p_note: optional(form, "note", 300),
  });
  if (error) return { ok: false, message: error.message };

  revalidatePath(`/${locale}/admin`, "layout");
  return { ok: true };
}

/* ==========================================================================
   settings
   ========================================================================== */
/**
 * Writes the settings that changed, one `set_setting` call each.
 *
 * Each key is validated in Postgres — a price below a thousand rupiah, a
 * feature switch that is not a boolean — so a typo in the form comes back as a
 * message rather than a silently broken paywall.
 */
export async function saveSettings(form: FormData): Promise<AdminResult> {
  const supabase = await createClient();
  const locale = loc(form.get("locale"));

  const stringKeys = ["bank.name", "bank.account_number", "bank.account_holder"];
  const numberKeys = [
    "price.premium",
    "price.annual",
    "free.children",
    "free.activities_per_day",
    "free.stories_per_month",
    "free.ai_questions_per_month",
    "order.window_hours",
  ];
  const boolKeys = [
    "feature.checkout",
    "feature.music",
    "feature.ai",
    "feature.worksheets",
  ];

  const failures: string[] = [];

  for (const key of stringKeys) {
    if (!form.has(key)) continue;
    const value = text(form, key, 200);
    const { error } = await supabase.rpc("set_setting", { p_key: key, p_value: value });
    if (error) failures.push(`${key}: ${error.message}`);
  }

  for (const key of numberKeys) {
    if (!form.has(key)) continue;
    const raw = String(form.get(key) ?? "").replace(/[^\d]/g, "");
    if (raw === "") {
      failures.push(`${key}: empty`);
      continue;
    }
    const { error } = await supabase.rpc("set_setting", {
      p_key: key,
      p_value: Number.parseInt(raw, 10),
    });
    if (error) failures.push(`${key}: ${error.message}`);
  }

  for (const key of boolKeys) {
    // A checkbox that is off sends nothing, so the hidden companion field is
    // what tells us the switch was on the form at all.
    if (!form.has(`present.${key}`)) continue;
    const { error } = await supabase.rpc("set_setting", {
      p_key: key,
      p_value: flag(form, key),
    });
    if (error) failures.push(`${key}: ${error.message}`);
  }

  if (failures.length > 0) {
    return {
      ok: false,
      message: locale === "en" ? "Some settings were not saved." : "Sebagian pengaturan gagal disimpan.",
      problems: failures,
    };
  }

  // The settings feed the landing page and the payment screen, not just the
  // console, so the whole locale tree is revalidated.
  revalidatePath(`/${locale}`, "layout");
  return { ok: true, message: locale === "en" ? "Saved" : "Tersimpan" };
}
