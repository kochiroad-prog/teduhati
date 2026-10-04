#!/usr/bin/env node
/**
 * Pulls content out of Supabase and back into content/ as JSON.
 *
 * The database is the source of truth now that content is edited in the admin
 * dashboard. These files are the backup: committed to git, diffable, and the
 * thing to restore from if a row is damaged. Run this after editing in the
 * dashboard, then commit the diff.
 *
 *   NEXT_PUBLIC_SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... npm run content:export
 *
 * The output is written in the same shape `npm run db:seed` reads, and the same
 * shape scripts/validate-content.mjs checks, so the round trip is lossless and
 * the validator still applies to the backup.
 */

import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

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
    ].join("\n"),
  );
  process.exit(1);
}

if (!key.startsWith("eyJ") || key.length < 100) {
  console.error(
    `SUPABASE_SERVICE_ROLE_KEY does not look like a key (got "${key.slice(0, 24)}...").`,
  );
  process.exit(1);
}

const supabase = createClient(url, key, { auth: { persistSession: false } });

async function fetchAll(table, select, order) {
  const rows = [];
  const size = 500;
  for (let from = 0; ; from += size) {
    const { data, error } = await supabase
      .from(table)
      .select(select)
      .order(order)
      .range(from, from + size - 1);
    if (error) {
      console.error(`${table}: ${error.message}`);
      process.exit(1);
    }
    rows.push(...(data ?? []));
    if ((data ?? []).length < size) break;
  }
  return rows;
}

/** Groups translation rows into the `t: { id, en }` shape the files use. */
function byLocale(rows, fkColumn, shape) {
  const map = new Map();
  for (const row of rows) {
    const key = row[fkColumn];
    if (!map.has(key)) map.set(key, {});
    map.get(key)[row.locale] = shape(row);
  }
  return map;
}

/** Drops nulls and empty arrays, so the files stay as readable as the originals. */
function tidy(object) {
  return Object.fromEntries(
    Object.entries(object).filter(
      ([, v]) => v !== null && v !== undefined && !(Array.isArray(v) && v.length === 0),
    ),
  );
}

async function write(path, rows) {
  const full = join(ROOT, path);
  await mkdir(join(full, ".."), { recursive: true });
  await writeFile(full, `${JSON.stringify(rows, null, 2)}\n`, "utf8");
  console.log(`  ${path}: ${rows.length}`);
}

console.log("Exporting content from Supabase:");

/* -------------------------------------------------------------------------- */
/* activities — one file per age band, matching the originals                  */
/* -------------------------------------------------------------------------- */
const activities = await fetchAll("activities", "*", "id");
const activityTr = byLocale(
  await fetchAll("activity_translations", "*", "activity_id"),
  "activity_id",
  (r) =>
    tidy({
      title: r.title,
      summary: r.summary,
      learning_goal: r.learning_goal,
      steps: r.steps,
      parent_tip: r.parent_tip,
      safety_notes: r.safety_notes,
      variations: r.variations,
      materials_text: r.materials_text,
    }),
);

const byBand = new Map();
for (const a of activities) {
  const row = tidy({
    id: a.id,
    age_band_code: a.age_band_code,
    age_min_months: a.age_min_months,
    age_max_months: a.age_max_months,
    primary_domain: a.primary_domain,
    secondary_domains: a.secondary_domains,
    skill_codes: a.skill_codes,
    duration_minutes: a.duration_minutes,
    difficulty: a.difficulty,
    bonding_level: a.bonding_level,
    materials: a.materials,
    no_materials: a.no_materials,
    screen_free: a.screen_free,
    needs_supervision: a.needs_supervision,
    music_mode: a.music_mode,
    illustration_path: a.illustration_path,
    source_reference: a.source_reference,
    status: a.status,
    is_premium: a.is_premium,
    reviewed_by_expert: a.reviewed_by_expert,
    t: activityTr.get(a.id) ?? {},
  });
  if (!byBand.has(a.age_band_code)) byBand.set(a.age_band_code, []);
  byBand.get(a.age_band_code).push(row);
}

for (const [band, rows] of [...byBand.entries()].sort()) {
  await write(`content/activities/${band}.json`, rows);
}

/* -------------------------------------------------------------------------- */
/* bonding moments                                                            */
/* -------------------------------------------------------------------------- */
const bonding = await fetchAll("bonding_moments", "*", "id");
const bondingTr = byLocale(
  await fetchAll("bonding_moment_translations", "*", "bonding_moment_id"),
  "bonding_moment_id",
  (r) => ({ title: r.title, prompt: r.prompt, why_it_matters: r.why_it_matters }),
);

await write(
  "content/bonding/moments.json",
  bonding.map((b) =>
    tidy({
      id: b.id,
      moment_type: b.moment_type,
      age_min_months: b.age_min_months,
      age_max_months: b.age_max_months,
      duration_minutes: b.duration_minutes,
      music_mode: b.music_mode,
      status: b.status,
      is_premium: b.is_premium,
      sort_order: b.sort_order,
      t: bondingTr.get(b.id) ?? {},
    }),
  ),
);

/* -------------------------------------------------------------------------- */
/* stories                                                                    */
/* -------------------------------------------------------------------------- */
const stories = await fetchAll("stories", "*", "id");
const storyTr = byLocale(
  await fetchAll("story_translations", "*", "story_id"),
  "story_id",
  (r) => ({ title: r.title, blurb: r.blurb, pages: r.pages }),
);

await write(
  "content/stories/stories.json",
  stories.map((s) =>
    tidy({
      id: s.id,
      theme: s.theme,
      age_min_months: s.age_min_months,
      age_max_months: s.age_max_months,
      reading_minutes: s.reading_minutes,
      is_interactive: s.is_interactive,
      music_mode: s.music_mode,
      cover_path: s.cover_path,
      status: s.status,
      is_premium: s.is_premium,
      t: storyTr.get(s.id) ?? {},
    }),
  ),
);

console.log("\nDone. Review the diff and commit it.");
