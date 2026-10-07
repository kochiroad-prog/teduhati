#!/usr/bin/env node
/**
 * Converts a folder of images to webp and uploads them into the illustration
 * ladder.
 *
 *   node --env-file-if-exists=.env.local scripts/upload-illustrations.mjs \
 *     --dir "D:\\TEDUHATI\\gambar\\domain" --as domain --dry-run
 *
 * The level decides where a file lands and what its name has to be:
 *
 *   --as domain    motor.png                 -> domains/motor.webp
 *   --as band      motor__m18_24.png         -> bands/motor/m18_24.webp
 *                  motor/m18_24.png          (a subfolder works too)
 *   --as activity  ACT-0042.png              -> activities/ACT-0042.webp
 *
 * Every name is checked against the database before anything is uploaded. A
 * file called "motorik.png" or "ACT-9999.png" is refused and listed, because an
 * image at a path the ladder never looks at is invisible — it would sit in the
 * bucket costing storage while the activity still shows Tumi, and nothing in
 * the product would ever say so.
 */

import { readdir, stat } from "node:fs/promises";
import { basename, extname, join, relative, sep } from "node:path";
import { createClient } from "@supabase/supabase-js";
import sharp from "sharp";

/* -------------------------------------------------------------------------- */
/* arguments                                                                  */
/* -------------------------------------------------------------------------- */
function flag(name) {
  const i = process.argv.indexOf(`--${name}`);
  if (i === -1) return null;
  const next = process.argv[i + 1];
  return next && !next.startsWith("--") ? next : "true";
}

const DIR = flag("dir");
const LEVEL = flag("as");
const DRY_RUN = flag("dry-run") !== null;
const MAX_PX = Number.parseInt(flag("max") ?? "640", 10) || 640;
const QUALITY = Number.parseInt(flag("quality") ?? "82", 10) || 82;

const LEVELS = ["domain", "band", "activity"];

if (!DIR || !LEVEL || !LEVELS.includes(LEVEL)) {
  console.error(
    [
      "Missing or unknown arguments.",
      "",
      '  --dir "D:\\\\TEDUHATI\\\\gambar\\\\domain"',
      `  --as  ${LEVELS.join(" | ")}`,
      "",
      "Optional: --max 640 --quality 82 --dry-run",
    ].join("\n"),
  );
  process.exit(1);
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error(
    [
      "Missing Supabase credentials. Put them in .env.local:",
      "  NEXT_PUBLIC_SUPABASE_URL=https://<project>.supabase.co",
      "  SUPABASE_SERVICE_ROLE_KEY=<service_role key from Settings > API>",
    ].join("\n"),
  );
  process.exit(1);
}
if (!key.startsWith("eyJ") || key.length < 100) {
  console.error(`SUPABASE_SERVICE_ROLE_KEY does not look like a key (got "${key.slice(0, 24)}...").`);
  process.exit(1);
}

const supabase = createClient(url, key, { auth: { persistSession: false } });

/* -------------------------------------------------------------------------- */
/* what the database will accept                                              */
/* -------------------------------------------------------------------------- */
const [{ data: domainRows }, { data: bandRows }, { data: activityRows }] =
  await Promise.all([
    supabase.from("domains").select("code"),
    supabase.from("age_bands").select("code"),
    supabase.from("activities").select("id"),
  ]);

const domains = new Set((domainRows ?? []).map((r) => r.code));
const bands = new Set((bandRows ?? []).map((r) => r.code));
const activities = new Set((activityRows ?? []).map((r) => r.id));

if (domains.size === 0) {
  console.error("Could not read the taxonomy. Check the service role key.");
  process.exit(1);
}

/* -------------------------------------------------------------------------- */
/* files                                                                      */
/* -------------------------------------------------------------------------- */
const SOURCE_EXT = new Set([".png", ".jpg", ".jpeg", ".webp"]);

async function walk(dir) {
  const out = [];
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch (error) {
    console.error(`Cannot read ${dir}: ${error.message}`);
    process.exit(1);
  }
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...(await walk(full)));
    else if (entry.isFile() && SOURCE_EXT.has(extname(entry.name).toLowerCase())) {
      out.push(full);
    }
  }
  return out;
}

/**
 * Where this file belongs, or why it does not belong anywhere.
 *
 * Returning a reason rather than throwing lets the run report every bad name at
 * once instead of stopping at the first, which matters when a batch of a
 * hundred came out of an image generator with slightly wrong filenames.
 */
function targetFor(file) {
  const stem = basename(file, extname(file)).trim();

  if (LEVEL === "domain") {
    if (!domains.has(stem)) {
      return { error: `"${stem}" is not a domain code` };
    }
    return { path: `domains/${stem}.webp` };
  }

  if (LEVEL === "activity") {
    const id = stem.toUpperCase();
    if (!/^ACT-\d{4}$/.test(id)) return { error: `"${stem}" is not an activity id` };
    if (!activities.has(id)) return { error: `${id} is not in the database` };
    return { path: `activities/${id}.webp` };
  }

  // band: either "<domain>__<band>" in the name, or "<domain>/<band>" on disk.
  let domain = null;
  let band = null;

  if (stem.includes("__")) {
    [domain, band] = stem.split("__", 2);
  } else {
    const parts = relative(DIR, file).split(sep);
    if (parts.length >= 2) {
      domain = parts[parts.length - 2];
      band = stem;
    }
  }

  if (!domain || !band) {
    return { error: `"${stem}" needs to be <domain>__<band> or sit in a <domain> folder` };
  }
  if (!domains.has(domain)) return { error: `"${domain}" is not a domain code` };
  if (!bands.has(band)) return { error: `"${band}" is not an age band code` };
  return { path: `bands/${domain}/${band}.webp` };
}

const files = await walk(DIR);

if (files.length === 0) {
  console.error(`No PNG, JPEG or webp files under ${DIR}.`);
  process.exit(1);
}

const planned = [];
const rejected = [];

for (const file of files) {
  const target = targetFor(file);
  if (target.error) rejected.push(`${basename(file)}: ${target.error}`);
  else planned.push({ file, path: target.path });
}

if (rejected.length > 0) {
  console.error(`\n${rejected.length} file(s) cannot be placed:\n`);
  for (const r of rejected) console.error(`  - ${r}`);
  console.error(
    "\nNothing was uploaded. An image at a path the ladder never looks at would\n" +
      "be invisible: the bucket would grow and the activity would still show Tumi.",
  );
  if (LEVEL === "domain") {
    console.error(`\nDomain codes:\n${[...domains].sort().map((d) => `  ${d}`).join("\n")}`);
  }
  if (LEVEL === "band") {
    console.error(`\nAge band codes:\n${[...bands].sort().map((b) => `  ${b}`).join("\n")}`);
  }
  process.exit(1);
}

/* -------------------------------------------------------------------------- */
/* run                                                                        */
/* -------------------------------------------------------------------------- */
console.log(
  `${planned.length} image(s) from ${DIR}\n` +
    `  level ${LEVEL} · max ${MAX_PX}px · quality ${QUALITY}\n` +
    `  ${DRY_RUN ? "DRY RUN — nothing will be written" : "converting and uploading"}\n`,
);

let done = 0;
let failed = 0;
let sourceBytes = 0;
let webpBytes = 0;

for (const { file, path } of planned) {
  const info = await stat(file);
  sourceBytes += info.size;

  let webp;
  try {
    webp = await sharp(file)
      // `inside` never crops: a square source stays square, and a wider one is
      // bounded by its longest side. The art is the point; trimming it to fit a
      // box would be a decision the generator never agreed to.
      .resize(MAX_PX, MAX_PX, { fit: "inside", withoutEnlargement: true })
      .webp({ quality: QUALITY })
      .toBuffer();
  } catch (error) {
    console.error(`  ${basename(file)}: could not convert — ${error.message}`);
    failed += 1;
    continue;
  }
  webpBytes += webp.length;

  if (DRY_RUN) {
    console.log(
      `  ${path}  ${Math.round(info.size / 1024)} KB -> ${Math.round(webp.length / 1024)} KB`,
    );
    done += 1;
    continue;
  }

  const { error } = await supabase.storage
    .from("illustrations")
    .upload(path, webp, { contentType: "image/webp", upsert: true });

  if (error) {
    console.error(`  ${path}: upload failed — ${error.message}`);
    failed += 1;
    continue;
  }

  done += 1;
  if (done % 20 === 0) console.log(`  ${done} uploaded…`);
}

const saved = sourceBytes > 0 ? Math.round((1 - webpBytes / sourceBytes) * 100) : 0;

console.log(
  `\n${done} done, ${failed} failed.\n` +
    `${Math.round(sourceBytes / 1024)} KB in, ${Math.round(webpBytes / 1024)} KB out (${saved}% smaller).\n` +
    (DRY_RUN
      ? "Nothing was written. Drop --dry-run to do it for real."
      : "Open the dashboard: the illustration figures on Ringkasan should have moved."),
);

process.exit(failed > 0 ? 1 : 0);
