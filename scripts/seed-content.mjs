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
import { createClient } from "@supabase/supabase-js";

const ROOT = new URL("..", import.meta.url).pathname;
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error(
    "Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY before running this.",
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
console.log("Pushing content to Supabase:");

// Parents go in before their translations, or the foreign keys fail.
await push("activities", activityRows, "id");
await push("activity_translations", activityTranslations, "activity_id,locale");
await push("bonding_moments", bondingRows, "id");
await push("bonding_moment_translations", bondingTranslations, "bonding_moment_id,locale");
await push("stories", storyRows, "id");
await push("story_translations", storyTranslations, "story_id,locale");

console.log("\nDone.");
