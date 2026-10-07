#!/usr/bin/env node
/**
 * Writes the image prompts for the illustration ladder.
 *
 *   node --env-file-if-exists=.env.local scripts/make-illustration-prompts.mjs
 *
 * Output: docs/illustration-prompts.md — three sections matching the three
 * rungs, so you can start with ten domain pictures and come back for the
 * specific ones later.
 *
 * The style block is repeated verbatim in every single prompt rather than
 * stated once at the top. Image generators do not carry context reliably
 * between turns, and a hundred pictures drifting apart in style is the one
 * thing that would make them worse than no pictures at all. Repetition is the
 * only thing that holds a batch together.
 *
 * Subjects come from the English translations: the content is bilingual anyway,
 * and image models follow English more closely.
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
      "Missing Supabase credentials. Put them in .env.local:",
      "  NEXT_PUBLIC_SUPABASE_URL=https://<project>.supabase.co",
      "  SUPABASE_SERVICE_ROLE_KEY=<service_role key from Settings > API>",
    ].join("\n"),
  );
  process.exit(1);
}

const supabase = createClient(url, key, { auth: { persistSession: false } });

/* -------------------------------------------------------------------------- */
/* the style, written once and repeated everywhere                            */
/* -------------------------------------------------------------------------- */
/**
 * Two instructions here are not decoration and should survive any edit.
 *
 * "Stylised characters, never photorealistic" — this is an app about other
 * people's small children, and photoreal children in generated art is a line
 * the product should not go near. It is also simply on-brand: Tumi is a
 * sticker, and a photoreal parent beside a sticker mascot looks broken.
 *
 * "Transparent background" — the app paints its own cream behind every card. A
 * baked-in white rectangle would show as a pale box on a warm page, which is
 * exactly what went wrong the first time the brand sheet was cut up.
 */
const STYLE = [
  "Soft kawaii flat-vector illustration in a calm, warm, premium children's-book style.",
  "Rounded organic shapes, gentle thick outlines, no gradients, no harsh shadows.",
  "Palette strictly: sage green #6f8f78, cream #f8f4ea, terracotta #b86f55, clay #c89a7b, warm yellow #e9c96a, deep ink #273029.",
  "Stylised characters with simple dot eyes, never photorealistic people, no text or lettering anywhere in the image.",
  "Square composition, subject centred with generous margin, transparent background.",
].join(" ");

/* -------------------------------------------------------------------------- */
/* data                                                                       */
/* -------------------------------------------------------------------------- */
const [{ data: domains }, { data: domainNames }, { data: bands }, { data: bandNames }] =
  await Promise.all([
    supabase.from("domains").select("code, sort_order"),
    supabase.from("domain_translations").select("domain_code, name, description").eq("locale", "en"),
    supabase.from("age_bands").select("code, age_min_months, age_max_months, sort_order"),
    supabase.from("age_band_translations").select("age_band_code, name, focus").eq("locale", "en"),
  ]);

if (!domains || domains.length === 0) {
  console.error("Could not read the taxonomy. Check the service role key.");
  process.exit(1);
}

const { data: activities, error: actError } = await supabase
  .from("activities")
  .select("id, primary_domain, age_band_code, status, activity_translations(locale, title, summary)")
  .order("id");

if (actError) {
  console.error(`Could not read the activities: ${actError.message}`);
  process.exit(1);
}

const domainName = new Map((domainNames ?? []).map((r) => [r.domain_code, r.name]));
const domainAbout = new Map((domainNames ?? []).map((r) => [r.domain_code, r.description]));
const bandName = new Map((bandNames ?? []).map((r) => [r.age_band_code, r.name]));
const bandFocus = new Map((bandNames ?? []).map((r) => [r.age_band_code, r.focus]));
const bandRange = new Map(
  (bands ?? []).map((b) => [b.code, `${b.age_min_months}-${b.age_max_months} months`]),
);

/** Which bands a domain actually has activities in — no prompts for empty cells. */
const pairs = new Map();
for (const a of activities ?? []) {
  const keyPair = `${a.primary_domain}__${a.age_band_code}`;
  if (!pairs.has(keyPair)) pairs.set(keyPair, 0);
  pairs.set(keyPair, pairs.get(keyPair) + 1);
}

function englishOf(a) {
  const rows = a.activity_translations ?? [];
  return rows.find((r) => r.locale === "en") ?? rows[0] ?? null;
}

/** One finished, self-contained prompt. */
function prompt(subject) {
  return `${STYLE} Subject: ${subject}`;
}

/* -------------------------------------------------------------------------- */
/* write                                                                      */
/* -------------------------------------------------------------------------- */
const out = [];

out.push("# Prompt ilustrasi TEDUHATI");
out.push("");
out.push(
  "Dibuat oleh `npm run art:prompts`. Jangan disunting langsung — jalankan lagi setelah kontennya berubah.",
);
out.push("");
out.push(
  "Setiap prompt sudah lengkap dan berdiri sendiri. Tempel satu per satu; jangan mengandalkan " +
    "generator mengingat prompt sebelumnya, karena di situlah gayanya mulai melenceng.",
);
out.push("");
out.push("Simpan hasilnya dengan nama berkas persis seperti yang tertulis di tiap bagian, lalu unggah dengan `npm run art:upload`.");
out.push("");

/* --- A: domains ----------------------------------------------------------- */
out.push("## A. Sepuluh gambar domain");
out.push("");
out.push("Mulai dari sini. Sepuluh berkas ini membuat seluruh pustaka terlihat berilustrasi.");
out.push("");
out.push("Nama berkas: `<kode domain>.png` — contoh `motor.png`. Unggah dengan `--as domain`.");
out.push("");

for (const d of (domains ?? []).sort((a, b) => a.sort_order - b.sort_order)) {
  const name = domainName.get(d.code) ?? d.code;
  const about = domainAbout.get(d.code) ?? "";
  out.push(`### \`${d.code}.png\` — ${name}`);
  out.push("");
  out.push("```");
  out.push(
    prompt(
      `a single warm scene representing "${name}" for a child aged nought to five${
        about ? ` — ${about.replace(/\s+/g, " ").trim()}` : ""
      }. One parent and one small child together, no other objects competing for attention.`,
    ),
  );
  out.push("```");
  out.push("");
}

/* --- B: domain x band ----------------------------------------------------- */
const bandList = (bands ?? []).sort((a, b) => a.sort_order - b.sort_order);
const pairKeys = [...pairs.entries()].filter(([, n]) => n > 0);

out.push("## B. Domain pada tiap kelompok usia");
out.push("");
out.push(
  `${pairKeys.length} gambar, hanya untuk pasangan yang benar-benar punya aktivitas. ` +
    "Kerjakan ini setelah A, dan hanya kalau gambar domainnya terasa terlalu umum.",
);
out.push("");
out.push("Nama berkas: `<domain>__<kelompok usia>.png` — contoh `motor__m18_24.png`. Unggah dengan `--as band`.");
out.push("");

for (const d of (domains ?? []).sort((a, b) => a.sort_order - b.sort_order)) {
  for (const b of bandList) {
    const count = pairs.get(`${d.code}__${b.code}`) ?? 0;
    if (count === 0) continue;
    const dn = domainName.get(d.code) ?? d.code;
    const bn = bandName.get(b.code) ?? b.code;
    const focus = bandFocus.get(b.code) ?? "";
    out.push(`### \`${d.code}__${b.code}.png\` — ${dn}, ${bn} (${count} aktivitas)`);
    out.push("");
    out.push("```");
    out.push(
      prompt(
        `"${dn}" with a child aged ${bandRange.get(b.code) ?? b.code}${
          focus ? `, where the focus at this age is ${focus.replace(/\s+/g, " ").trim().toLowerCase()}` : ""
        }. One parent and one child of clearly that age, doing it together.`,
      ),
    );
    out.push("```");
    out.push("");
  }
}

/* --- C: per activity ------------------------------------------------------ */
out.push("## C. Satu gambar per aktivitas");
out.push("");
out.push(
  `${(activities ?? []).length} gambar. Paling banyak tenaganya dan paling sulit dijaga konsistensinya. ` +
    "Kerjakan belakangan, dan boleh sebagian saja — aktivitas yang belum punya gambar sendiri " +
    "otomatis memakai gambar domainnya.",
);
out.push("");
out.push("Nama berkas: `<id aktivitas>.png` — contoh `ACT-0042.png`. Unggah dengan `--as activity`.");
out.push("");

let skipped = 0;
for (const a of activities ?? []) {
  const en = englishOf(a);
  if (!en) {
    skipped += 1;
    continue;
  }
  out.push(`### \`${a.id}.png\` — ${en.title}`);
  out.push("");
  out.push("```");
  out.push(
    prompt(
      `${en.summary.replace(/\s+/g, " ").trim()} Show one parent and one small child doing exactly this, nothing else.`,
    ),
  );
  out.push("```");
  out.push("");
}

const target = join(ROOT, "docs/illustration-prompts.md");
await mkdir(join(ROOT, "docs"), { recursive: true });
await writeFile(target, `${out.join("\n")}\n`, "utf8");

console.log(
  `docs/illustration-prompts.md\n` +
    `  A. ${(domains ?? []).length} domain\n` +
    `  B. ${pairKeys.length} domain x kelompok usia\n` +
    `  C. ${(activities ?? []).length - skipped} aktivitas` +
    (skipped > 0 ? ` (${skipped} dilewati, belum ada terjemahan)` : "") +
    `\n\nMulai dari bagian A. Sepuluh gambar sudah cukup untuk mengisi seluruh pustaka.`,
);
