#!/usr/bin/env node
/**
 * Imports a folder of worksheet PDFs into Supabase.
 *
 * One run handles one folder, with one age range and one domain given on the
 * command line. That is deliberate: the filenames in these packs describe the
 * design ("Hijau Putih Ilustrasi"), not the pedagogy, so nothing in them can be
 * trusted to say which age a sheet suits. Pointing the script at a folder of
 * similar material and stating the tagging once is honest; guessing it fifteen
 * thousand times is not.
 *
 * Every row arrives as a DRAFT. Publishing is a separate, deliberate act in the
 * dashboard, and the database refuses to publish a worksheet that has no file
 * or is missing a language.
 *
 *   node --env-file-if-exists=.env.local scripts/import-worksheets.mjs \
 *     --dir "D:\\TEDUHATI\\worksheet\\pra-menulis" \
 *     --age 24-48 --domain motor --premium --dry-run
 *
 * Flags:
 *   --dir      folder to walk (recursively). Required.
 *   --age      inclusive range in months, e.g. 24-48. Required.
 *   --domain   a domain code from the taxonomy. Required.
 *   --prefix   storage folder inside the bucket. Defaults to the domain.
 *   --premium  mark these as Premium-only. Default: free.
 *   --limit    stop after N files. Useful for a first run.
 *   --dry-run  list what would happen and write nothing.
 */

import { readdir, readFile, stat } from "node:fs/promises";
import { basename, extname, join } from "node:path";
import { createClient } from "@supabase/supabase-js";

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
const AGE = flag("age");
const DOMAIN = flag("domain");
const PREFIX = flag("prefix") ?? DOMAIN;
const PREMIUM = flag("premium") !== null;
const DRY_RUN = flag("dry-run") !== null;
const LIMIT = Number.parseInt(flag("limit") ?? "0", 10) || Infinity;

if (!DIR || !AGE || !DOMAIN) {
  console.error(
    [
      "Missing an argument.",
      "",
      '  --dir "D:\\\\TEDUHATI\\\\worksheet\\\\pra-menulis"',
      "  --age 24-48",
      "  --domain motor",
      "",
      "Optional: --prefix <folder> --premium --limit N --dry-run",
    ].join("\n"),
  );
  process.exit(1);
}

const ageMatch = /^(\d{1,2})-(\d{1,2})$/.exec(AGE);
if (!ageMatch) {
  console.error(`--age must look like 24-48, got "${AGE}".`);
  process.exit(1);
}
const AGE_MIN = Number.parseInt(ageMatch[1], 10);
const AGE_MAX = Number.parseInt(ageMatch[2], 10);

// The product is nought to five. A sheet outside that range would be recommended
// to nobody, and the database refuses to publish it, so the run stops here
// rather than filling the table with rows that can never go live.
if (AGE_MAX > 72 || AGE_MIN >= AGE_MAX) {
  console.error(
    `--age ${AGE} is outside the product. TEDUHATI covers 0-72 months, and the\n` +
      "minimum must be below the maximum.",
  );
  process.exit(1);
}

/* -------------------------------------------------------------------------- */
/* credentials                                                                */
/* -------------------------------------------------------------------------- */
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
/* helpers                                                                    */
/* -------------------------------------------------------------------------- */

/** A storage-safe name. Storage keys dislike spaces and anything non-ASCII. */
function slugify(name) {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

/**
 * A readable title from a filename.
 *
 * These packs name files after the artwork — "Perkalian Lembar Kerja Hijau
 * Minimalis" — so the colour and style words are stripped and what is left is
 * the subject. It is a starting point for the editor, not a finished title,
 * which is why every row lands as a draft.
 */
const NOISE = [
  "lembar kerja", "worksheet", "printable", "pdf",
  "hijau", "biru", "merah", "kuning", "ungu", "cokelat", "coklat", "putih", "hitam",
  "pastel", "minimalis", "ilustrasi", "watercolor", "cat air", "sederhana",
  "lucu", "simple", "modern", "aesthetic", "colorful", "warna warni",
];

function titleFromFilename(filename) {
  let base = basename(filename, extname(filename)).replace(/[_-]+/g, " ");
  for (const word of NOISE) {
    base = base.replace(new RegExp(`\\b${word}\\b`, "gi"), " ");
  }
  base = base.replace(/\s+/g, " ").trim();
  if (!base) base = basename(filename, extname(filename));
  return base.charAt(0).toUpperCase() + base.slice(1);
}

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
    else if (entry.isFile() && extname(entry.name).toLowerCase() === ".pdf") out.push(full);
  }
  return out;
}

/* -------------------------------------------------------------------------- */
/* run                                                                        */
/* -------------------------------------------------------------------------- */
const { data: domainRow, error: domainError } = await supabase
  .from("domains")
  .select("code")
  .eq("code", DOMAIN)
  .maybeSingle();

if (domainError || !domainRow) {
  const { data: all } = await supabase.from("domains").select("code").order("sort_order");
  console.error(
    `Unknown domain "${DOMAIN}".\n\nKnown domains:\n${(all ?? [])
      .map((d) => `  ${d.code}`)
      .join("\n")}`,
  );
  process.exit(1);
}

const files = (await walk(DIR)).slice(0, LIMIT === Infinity ? undefined : LIMIT);

if (files.length === 0) {
  console.error(`No PDF files under ${DIR}.`);
  process.exit(1);
}

// Already-imported files are recognised by their original filename, so a run
// that is interrupted can simply be run again.
const { data: existingRows } = await supabase
  .from("worksheets")
  .select("source_name")
  .not("source_name", "is", null);
const existing = new Set((existingRows ?? []).map((r) => r.source_name));

const { data: nextIdRaw } = await supabase.rpc("next_content_id", { p_table: "worksheets" });
let counter = Number.parseInt((nextIdRaw ?? "WRK-0001").slice(4), 10);

console.log(
  `${files.length} PDF(s) under ${DIR}\n` +
    `  age ${AGE_MIN}-${AGE_MAX} months · domain ${DOMAIN} · ${PREMIUM ? "Premium" : "free"}\n` +
    `  ${DRY_RUN ? "DRY RUN — nothing will be written" : "importing as drafts"}\n`,
);

let imported = 0;
let skipped = 0;
let failed = 0;

for (const file of files) {
  const name = basename(file);
  if (existing.has(name)) {
    skipped += 1;
    continue;
  }

  const id = `WRK-${String(counter).padStart(4, "0")}`;
  const storagePath = `${PREFIX}/${slugify(basename(file, extname(file)))}-${id}.pdf`;
  const title = titleFromFilename(name);
  const info = await stat(file);

  if (DRY_RUN) {
    console.log(`  ${id}  ${title}`);
    console.log(`         ${storagePath}  (${Math.round(info.size / 1024)} KB)`);
    counter += 1;
    imported += 1;
    continue;
  }

  const body = await readFile(file);
  const { error: uploadError } = await supabase.storage
    .from("worksheets")
    .upload(storagePath, body, { contentType: "application/pdf", upsert: true });

  if (uploadError) {
    console.error(`  ${name}: upload failed — ${uploadError.message}`);
    failed += 1;
    continue;
  }

  const { error: rowError } = await supabase.from("worksheets").insert({
    id,
    age_min_months: AGE_MIN,
    age_max_months: AGE_MAX,
    primary_domain: DOMAIN,
    page_count: 1,
    file_path: storagePath,
    file_bytes: info.size,
    source_name: name,
    status: "draft",
    is_premium: PREMIUM,
  });

  if (rowError) {
    console.error(`  ${name}: row failed — ${rowError.message}`);
    failed += 1;
    continue;
  }

  // Both languages are mandatory before publishing. The Indonesian title comes
  // from the filename and the English one is left identical on purpose: an
  // obviously untranslated title is a visible prompt for the editor, where a
  // machine-translated guess would look finished and be wrong.
  const { error: trError } = await supabase.from("worksheet_translations").insert([
    { worksheet_id: id, locale: "id", title, description: `Lembar kerja ${title.toLowerCase()}.` },
    { worksheet_id: id, locale: "en", title, description: `Worksheet: ${title.toLowerCase()}.` },
  ]);

  if (trError) {
    console.error(`  ${name}: translations failed — ${trError.message}`);
    failed += 1;
    continue;
  }

  counter += 1;
  imported += 1;
  if (imported % 25 === 0) console.log(`  ${imported} imported…`);
}

console.log(
  `\n${imported} imported, ${skipped} already there, ${failed} failed.\n` +
    (DRY_RUN
      ? "Nothing was written. Drop --dry-run to do it for real."
      : "All drafts. Review and publish them in the dashboard: /id/admin/konten/lembar-kerja"),
);

process.exit(failed > 0 ? 1 : 0);
