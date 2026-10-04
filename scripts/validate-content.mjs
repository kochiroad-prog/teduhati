#!/usr/bin/env node
/**
 * Checks every content file before it can reach the database.
 *
 * Content for babies is the part of this product where a mistake matters most,
 * so the rules here are strict: ids unique and well formed, age ranges inside
 * their band, every domain/skill/material code known, both locales present, and
 * a safety note on anything involving materials or a baby under twelve months.
 *
 *   node scripts/validate-content.mjs
 */

import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";

const ROOT = new URL("..", import.meta.url).pathname;
const ACTIVITY_DIR = join(ROOT, "content/activities");
const LOCALES = ["id", "en"];

const AGE_BANDS = {
  m00_03: [0, 3],
  m03_06: [3, 6],
  m06_09: [6, 9],
  m09_12: [9, 12],
  m12_18: [12, 18],
  m18_24: [18, 24],
  m24_36: [24, 36],
  m36_48: [36, 48],
  m48_60: [48, 60],
};

const DOMAINS = new Set([
  "social_emotional", "language", "cognitive", "motor", "sensory",
  "self_care", "creativity", "early_literacy", "early_numeracy", "school_readiness",
]);

const SKILLS = new Set([
  "bonding", "social_response", "turn_taking", "emotion_naming", "cooperation",
  "vocal_response", "gesture", "vocabulary", "conversation", "storytelling",
  "attention", "cause_effect", "sorting", "memory", "problem_solving",
  "head_control", "reaching", "sitting_crawling", "walking_balance", "fine_motor",
  "visual_tracking", "auditory", "tactile", "texture_explore",
  "art_making", "music_movement", "pretend_play", "building",
  "routine", "self_feeding", "tidying", "dressing",
  "book_handling", "phonological", "letter_awareness",
  "counting", "pattern", "shape_size", "number_symbol",
  "following_steps", "focus_persistence", "independence",
]);

const MATERIALS = new Set([
  "kain", "selimut", "bantal", "sendok", "mangkuk", "gelas_plastik", "kardus",
  "kertas", "krayon", "spidol", "lakban", "botol", "beras", "air", "cermin",
  "bola", "boneka", "buku", "keranjang", "jepitan", "tali", "balok", "pom_pom",
  "cat_air", "stiker", "playdough", "kartu_gambar", "alat_musik",
]);

const MUSIC_MODES = new Set(["morning", "play", "bonding", "bedtime"]);

const problems = [];
const seenIds = new Set();
let count = 0;

function fail(where, message) {
  problems.push(`${where}: ${message}`);
}

function checkActivity(activity, file) {
  const where = `${file} ${activity.id ?? "(no id)"}`;

  if (!/^ACT-\d{4}$/.test(activity.id ?? "")) {
    fail(where, "id must look like ACT-0001");
  } else if (seenIds.has(activity.id)) {
    fail(where, "duplicate id");
  } else {
    seenIds.add(activity.id);
  }

  const band = AGE_BANDS[activity.age_band_code];
  if (!band) {
    fail(where, `unknown age_band_code "${activity.age_band_code}"`);
  } else {
    const [bandMin, bandMax] = band;
    if (activity.age_min_months < bandMin || activity.age_max_months > bandMax) {
      fail(
        where,
        `age range ${activity.age_min_months}-${activity.age_max_months} falls outside band ${activity.age_band_code} (${bandMin}-${bandMax})`,
      );
    }
    if (activity.age_max_months <= activity.age_min_months) {
      fail(where, "age_max_months must be greater than age_min_months");
    }
  }

  if (!DOMAINS.has(activity.primary_domain)) {
    fail(where, `unknown primary_domain "${activity.primary_domain}"`);
  }
  for (const d of activity.secondary_domains ?? []) {
    if (!DOMAINS.has(d)) fail(where, `unknown secondary domain "${d}"`);
  }
  for (const s of activity.skill_codes ?? []) {
    if (!SKILLS.has(s)) fail(where, `unknown skill "${s}"`);
  }
  for (const m of activity.materials ?? []) {
    if (!MATERIALS.has(m)) fail(where, `unknown material "${m}"`);
  }

  if (activity.music_mode && !MUSIC_MODES.has(activity.music_mode)) {
    fail(where, `unknown music_mode "${activity.music_mode}"`);
  }

  if (!(activity.duration_minutes >= 1 && activity.duration_minutes <= 60)) {
    fail(where, "duration_minutes must be between 1 and 60");
  }
  if (![1, 2, 3].includes(activity.difficulty)) {
    fail(where, "difficulty must be 1, 2 or 3");
  }
  if (![1, 2, 3].includes(activity.bonding_level)) {
    fail(where, "bonding_level must be 1, 2 or 3");
  }

  const hasMaterials = (activity.materials ?? []).length > 0;
  if (hasMaterials && activity.no_materials) {
    fail(where, "no_materials is true but materials are listed");
  }
  if (!hasMaterials && !activity.no_materials) {
    fail(where, "no materials listed, so no_materials should be true");
  }

  for (const locale of LOCALES) {
    const t = activity.t?.[locale];
    if (!t) {
      fail(where, `missing "${locale}" translation`);
      continue;
    }

    for (const field of ["title", "summary", "learning_goal", "materials_text"]) {
      if (typeof t[field] !== "string" || !t[field].trim()) {
        fail(where, `${locale}.${field} is empty`);
      }
    }

    if (!Array.isArray(t.steps) || t.steps.length < 3) {
      fail(where, `${locale}.steps needs at least 3 steps`);
    } else {
      t.steps.forEach((step, i) => {
        if (typeof step?.title !== "string" || !step.title.trim()) {
          fail(where, `${locale}.steps[${i}].title is empty`);
        }
        if (typeof step?.body !== "string" || step.body.trim().length < 20) {
          fail(where, `${locale}.steps[${i}].body is too short to follow`);
        }
      });
    }

    // Safety is not optional where it matters.
    const needsSafety = hasMaterials || activity.age_min_months < 12;
    if (needsSafety && (!t.safety_notes || !t.safety_notes.trim())) {
      fail(
        where,
        `${locale}.safety_notes is required for an activity with materials or for under-twelve-months`,
      );
    }

    // Steps must not contradict the step count across locales.
    const other = LOCALES.find((l) => l !== locale);
    const otherSteps = activity.t?.[other]?.steps;
    if (Array.isArray(otherSteps) && Array.isArray(t.steps) && otherSteps.length !== t.steps.length) {
      fail(where, `step count differs between locales (${locale}: ${t.steps.length}, ${other}: ${otherSteps.length})`);
    }
  }

  count += 1;
}

const MOMENT_TYPES = new Set([
  "morning", "play", "meal", "bath", "outdoor", "bedtime", "anytime",
]);

let bondingCount = 0;
let storyCount = 0;

function checkBonding(moment, file) {
  const where = `${file} ${moment.id ?? "(no id)"}`;

  if (!/^BND-\d{4}$/.test(moment.id ?? "")) fail(where, "id must look like BND-0001");
  else if (seenIds.has(moment.id)) fail(where, "duplicate id");
  else seenIds.add(moment.id);

  if (!MOMENT_TYPES.has(moment.moment_type)) {
    fail(where, `unknown moment_type "${moment.moment_type}"`);
  }
  if (moment.music_mode && !MUSIC_MODES.has(moment.music_mode)) {
    fail(where, `unknown music_mode "${moment.music_mode}"`);
  }
  if (moment.age_max_months <= moment.age_min_months) {
    fail(where, "age_max_months must be greater than age_min_months");
  }
  if (!(moment.duration_minutes >= 1 && moment.duration_minutes <= 15)) {
    fail(where, "duration_minutes must be between 1 and 15");
  }

  for (const locale of LOCALES) {
    const t = moment.t?.[locale];
    if (!t) {
      fail(where, `missing "${locale}" translation`);
      continue;
    }
    for (const field of ["title", "prompt", "why_it_matters"]) {
      if (typeof t[field] !== "string" || !t[field].trim()) {
        fail(where, `${locale}.${field} is empty`);
      }
    }
    // A bonding moment the parent can't act on in one breath isn't a moment.
    if (typeof t.prompt === "string" && t.prompt.length > 220) {
      fail(where, `${locale}.prompt is too long for a one-to-three minute moment`);
    }
    for (const key of Object.keys(t)) {
      if (!key.trim()) fail(where, `${locale} has an empty key`);
    }
  }

  bondingCount += 1;
}

function checkStory(story, file) {
  const where = `${file} ${story.id ?? "(no id)"}`;

  if (!/^STR-\d{4}$/.test(story.id ?? "")) fail(where, "id must look like STR-0001");
  else if (seenIds.has(story.id)) fail(where, "duplicate id");
  else seenIds.add(story.id);

  if (story.age_max_months <= story.age_min_months) {
    fail(where, "age_max_months must be greater than age_min_months");
  }
  if (story.music_mode && !MUSIC_MODES.has(story.music_mode)) {
    fail(where, `unknown music_mode "${story.music_mode}"`);
  }

  for (const locale of LOCALES) {
    const t = story.t?.[locale];
    if (!t) {
      fail(where, `missing "${locale}" translation`);
      continue;
    }
    for (const field of ["title", "blurb"]) {
      if (typeof t[field] !== "string" || !t[field].trim()) {
        fail(where, `${locale}.${field} is empty`);
      }
    }
    if (!Array.isArray(t.pages) || t.pages.length < 3) {
      fail(where, `${locale}.pages needs at least 3 pages`);
      continue;
    }
    t.pages.forEach((page, i) => {
      if (typeof page?.text !== "string" || !page.text.trim()) {
        fail(where, `${locale}.pages[${i}].text is empty`);
      }
      if (page?.choices !== undefined) {
        if (!Array.isArray(page.choices) || page.choices.length < 2) {
          fail(where, `${locale}.pages[${i}].choices needs at least 2 options`);
        } else {
          page.choices.forEach((c, j) => {
            if (typeof c?.label !== "string" || !c.label.trim()) {
              fail(where, `${locale}.pages[${i}].choices[${j}].label is empty`);
            }
          });
        }
      }
    });

    const other = LOCALES.find((l) => l !== locale);
    const otherPages = story.t?.[other]?.pages;
    if (Array.isArray(otherPages) && otherPages.length !== t.pages.length) {
      fail(where, `page count differs between locales (${locale}: ${t.pages.length}, ${other}: ${otherPages.length})`);
    }
  }

  // A story marked interactive has to actually offer a choice somewhere.
  if (story.is_interactive) {
    const hasChoice = LOCALES.every((l) =>
      (story.t?.[l]?.pages ?? []).some((p) => Array.isArray(p?.choices) && p.choices.length > 0),
    );
    if (!hasChoice) fail(where, "is_interactive is true but no page offers choices");
  }

  storyCount += 1;
}

async function loadDir(dir, label) {
  let names;
  try {
    names = (await readdir(dir)).filter((f) => f.endsWith(".json")).sort();
  } catch {
    return [];
  }
  const out = [];
  for (const name of names) {
    try {
      const parsed = JSON.parse(await readFile(join(dir, name), "utf8"));
      if (!Array.isArray(parsed)) {
        fail(name, `file must contain an array of ${label}`);
        continue;
      }
      out.push([name, parsed]);
    } catch (error) {
      fail(name, `invalid JSON: ${error.message}`);
    }
  }
  return out;
}

const activityFiles = await loadDir(ACTIVITY_DIR, "activities");

if (activityFiles.length === 0) {
  console.error("No activity files found in content/activities");
  process.exit(1);
}

for (const [file, rows] of activityFiles) {
  for (const activity of rows) checkActivity(activity, file);
}

for (const [file, rows] of await loadDir(join(ROOT, "content/bonding"), "bonding moments")) {
  for (const moment of rows) checkBonding(moment, file);
}

for (const [file, rows] of await loadDir(join(ROOT, "content/stories"), "stories")) {
  for (const story of rows) checkStory(story, file);
}

if (problems.length > 0) {
  console.error(`\n${problems.length} problem(s) found:\n`);
  for (const p of problems) console.error(`  - ${p}`);
  process.exit(1);
}

console.log(
  `${count} activities, ${bondingCount} bonding moments, ${storyCount} stories — all good.`,
);
