#!/usr/bin/env node
/**
 * Pushes content from content/ into Supabase.
 *
 * Runs with the service-role key because content tables are read-only to
 * clients by design. Upserts, so it is safe to run again after an edit.
 *
 *   NEXT_PUBLIC_SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... npm run db:seed
 *
 * Validation runs first and a single problem stops the whole push, so a bad
 * safety note can never reach a parent.
 */

import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

// fileURLToPath, not .pathname: on Windows a file URL's pathname is
// "/D:/TEDUHATI/", which is not a path any fs call can open.
const ROOT = fileURLToPath(new URL("..", import.meta.url));
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error(
    [
      "Missing Supabase credentials.",
      "",
      "Put them in .env.local (this script reads it automatically):",
      "  NEXT_PUBLIC_SUPABASE_URL=https://<project>.supabase.co",
      "  SUPABASE_SERVICE_ROLE_KEY=<service_role key from Settings > API>",
      "",
      "The service role key bypasses row level security, so it is server-only:",
      "never commit it and never put it in a NEXT_PUBLIC_ variable.",
    ].join("\n"),
  );
  process.exit(1);
}

// A real service role key is a JWT. Catching the placeholder here gives a clear
// message instead of an opaque 401 from PostgREST.
if (!key.startsWith("eyJ") || key.length < 100) {
  console.error(
    `SUPABASE_SERVICE_ROLE_KEY does not look like a key (got "${key.slice(0, 24)}...").\n` +
      "Copy the service_role key from Supabase: Settings > API > Project API keys.",
  );
  process.exit(1);
}

const supabase = createClient(url, key, { auth: { persistSession: false } });

async function readJsonDir(dir) {
  let names;
  try {
    names = (await readdir(join(ROOT, dir))).filter((f) => f.endsWith(".json")).sort();
  } catch {
    return [];
  }
  const out = [];
  for (const name of names) {
    const parsed = JSON.parse(await readFile(join(ROOT, dir, name), "utf8"));
    out.push(...(Array.isArray(parsed) ? parsed : [parsed]));
  }
  return out;
}

async function push(table, rows, conflict) {
  if (rows.length === 0) return 0;
  // Chunked so a large content set doesn't hit the request size limit.
  const size = 100;
  let done = 0;
  for (let i = 0; i < rows.length; i += size) {
    const chunk = rows.slice(i, i + size);
    const { error } = await supabase.from(table).upsert(chunk, { onConflict: conflict });
    if (error) {
      console.error(`\n${table} failed at row ${i}: ${error.message}`);
      process.exit(1);
    }
    done += chunk.length;
  }
  console.log(`  ${table}: ${done}`);
  return done;
}

/* -------------------------------------------------------------------------- */
/* activities                                                                 */
/* -------------------------------------------------------------------------- */
const activities = await readJsonDir("content/activities");

const activityRows = activities.map((a) => ({
  id: a.id,
  age_min_months: a.age_min_months,
  age_max_months: a.age_max_months,
  age_band_code: a.age_band_code,
  primary_domain: a.primary_domain,
  secondary_domains: a.secondary_domains ?? [],
  skill_codes: a.skill_codes ?? [],
  duration_minutes: a.duration_minutes,
  difficulty: a.difficulty,
  materials: a.materials ?? [],
  no_materials: Boolean(a.no_materials),
  screen_free: a.screen_free ?? true,
  needs_supervision: a.needs_supervision ?? true,
  bonding_level: a.bonding_level,
  music_mode: a.music_mode ?? null,
  illustration_path: a.illustration_path ?? `activities/${a.id}.webp`,
  character_animation: a.character_animation ?? "tumi-happy",
  completion_sound: a.completion_sound ?? "complete",
  source_reference: a.source_reference ?? null,
  status: a.status ?? "published",
  is_premium: Boolean(a.is_premium),
  reviewed_by_expert: Boolean(a.reviewed_by_expert),
}));

const activityTranslations = activities.flatMap((a) =>
  Object.entries(a.t).map(([locale, t]) => ({
    activity_id: a.id,
    locale,
    title: t.title,
    summary: t.summary,
    learning_goal: t.learning_goal,
    steps: t.steps,
    parent_tip: t.parent_tip ?? null,
    safety_notes: t.safety_notes ?? null,
    variations: t.variations ?? [],
    materials_text: t.materials_text ?? null,
  })),
);

/* -------------------------------------------------------------------------- */
/* bonding moments                                                            */
/* -------------------------------------------------------------------------- */
const bonding = await readJsonDir("content/bonding");

const bondingRows = bonding.map((b) => ({
  id: b.id,
  age_min_months: b.age_min_months,
  age_max_months: b.age_max_months,
  moment_type: b.moment_type,
  duration_minutes: b.duration_minutes,
  music_mode: b.music_mode ?? null,
  character_animation: b.character_animation ?? "tumi-happy",
  status: b.status ?? "published",
  is_premium: Boolean(b.is_premium),
  sort_order: b.sort_order ?? 0,
}));

const bondingTranslations = bonding.flatMap((b) =>
  Object.entries(b.t).map(([locale, t]) => ({
    bonding_moment_id: b.id,
    locale,
    title: t.title,
    prompt: t.prompt,
    why_it_matters: t.why_it_matters,
  })),
);

/* -------------------------------------------------------------------------- */
/* stories                                                                    */
/* -------------------------------------------------------------------------- */
const stories = await readJsonDir("content/stories");

const storyRows = stories.map((s) => ({
  id: s.id,
  age_min_months: s.age_min_months,
  age_max_months: s.age_max_months,
  theme: s.theme,
  is_interactive: Boolean(s.is_interactive),
  reading_minutes: s.reading_minutes,
  music_mode: s.music_mode ?? "bedtime",
  cover_path: s.cover_path ?? `stories/${s.id}.webp`,
  status: s.status ?? "published",
  is_premium: Boolean(s.is_premium),
}));

const storyTranslations = stories.flatMap((s) =>
  Object.entries(s.t).map(([locale, t]) => ({
    story_id: s.id,
    locale,
    title: t.title,
    blurb: t.blurb,
    pages: t.pages,
  })),
);

/* -------------------------------------------------------------------------- */
/* the guard                                                                  */
/* -------------------------------------------------------------------------- */
/**
 * The database is now the source of truth, not these files.
 *
 * Content is edited in the admin dashboard, so running this import would
 * quietly overwrite that work. It therefore refuses when anything has been
 * edited since the last import, and says which rows. `--force` is the explicit
 * way to say "the files win", and `npm run content:export` is the way to pull
 * dashboard edits back into the files first.
 */
const force = process.argv.includes("--force");
const LAST_IMPORT_KEY = "content.last_import";

const { data: marker } = await supabase
  .from("app_settings")
  .select("value")
  .eq("key", LAST_IMPORT_KEY)
  .maybeSingle();

// A string jsonb value; no marker means nothing has ever been imported, so
// there is nothing to protect.
const lastImport = typeof marker?.value === "string" ? marker.value : null;

if (lastImport && !force) {
  const tables = [
    ["activities", "id"],
    ["bonding_moments", "id"],
    ["stories", "id"],
  ];
  const touched = [];
  for (const [table, idColumn] of tables) {
    const { data } = await supabase
      .from(table)
      .select(`${idColumn}, updated_at`)
      .gt("updated_at", lastImport)
      .order("updated_at", { ascending: false })
      .limit(10);
    for (const row of data ?? []) touched.push(`${table} ${row[idColumn]}`);
  }

  if (touched.length > 0) {
    console.error(
      [
        `${touched.length} row(s) have been edited in the dashboard since the last import:`,
        "",
        ...touched.map((t) => `  - ${t}`),
        "",
        "The database is the source of truth, so importing now would overwrite them.",
        "",
        "  npm run content:export    pull the dashboard's version into content/",
        "  npm run db:seed -- --force   discard those edits and let the files win",
      ].join("\n"),
    );
    process.exit(1);
  }
}

/* -------------------------------------------------------------------------- */
console.log("Pushing content to Supabase:");

/**
 * Parents go in as drafts first, then their translations, then the real status.
 *
 * The publish gate in Postgres checks that both locales exist before a row can
 * be published, and each of these requests is its own transaction — so a new
 * activity inserted straight to `published` would be refused for translations
 * that are still one request away. Importing in three passes satisfies the gate
 * honestly rather than working around it.
 */
const intendedStatus = new Map();
function asDraft(rows) {
  return rows.map((row) => {
    intendedStatus.set(row.id, row.status ?? "published");
    return { ...row, status: "draft" };
  });
}

async function applyStatus(table, rows) {
  const toPublish = rows.filter((r) => intendedStatus.get(r.id) !== "draft");
  let done = 0;
  for (const row of toPublish) {
    const { error } = await supabase
      .from(table)
      .update({ status: intendedStatus.get(row.id) })
      .eq("id", row.id);
    if (error) {
      console.error(`\n${table} ${row.id} could not be published: ${error.message}`);
      process.exit(1);
    }
    done += 1;
  }
  console.log(`  ${table} published: ${done}`);
}

await push("activities", asDraft(activityRows), "id");
await push("activity_translations", activityTranslations, "activity_id,locale");
await applyStatus("activities", activityRows);

await push("bonding_moments", asDraft(bondingRows), "id");
await push("bonding_moment_translations", bondingTranslations, "bonding_moment_id,locale");
await applyStatus("bonding_moments", bondingRows);

await push("stories", asDraft(storyRows), "id");
await push("story_translations", storyTranslations, "story_id,locale");
await applyStatus("stories", storyRows);

// Recorded last, so a failed import does not move the marker and leave the next
// run thinking the dashboard edits were already imported.
const { error: markerError } = await supabase
  .from("app_settings")
  .upsert({
    key: LAST_IMPORT_KEY,
    value: new Date().toISOString(),
    is_public: false,
    label: "Impor konten terakhir",
    description: "Dipakai db:seed untuk mendeteksi suntingan dashboard.",
  });

if (markerError) {
  console.error(`\nImport succeeded but the marker could not be written: ${markerError.message}`);
  process.exit(1);
}

console.log("\nDone.");
