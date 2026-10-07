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
 *
 * Everything runs inside main() and nothing calls process.exit(). Importing
 * sharp starts libuv worker handles, and exiting while those are still closing
 * aborts the process on Windows with "Assertion failed:
 * !(handle->flags & UV_HANDLE_CLOSING), file src\\win\\async.c" — printed after
 * the real message, which makes a clear error look like a crash. Setting
 * process.exitCode and returning lets the loop drain first.
 */

import { readdir, stat } from "node:fs/promises";
import { basename, extname, join, relative, sep } from "node:path";
import { createClient } from "@supabase/supabase-js";
import sharp from "sharp";

const LEVELS = ["domain", "band", "activity"];
const SOURCE_EXT = new Set([".png", ".jpg", ".jpeg", ".webp"]);

function flag(name) {
  const i = process.argv.indexOf(`--${name}`);
  if (i === -1) return null;
  const next = process.argv[i + 1];
  return next && !next.startsWith("--") ? next : "true";
}

/** Print, mark the run as failed, and let the caller return. */
function fail(...lines) {
  console.error(lines.join("\n"));
  process.exitCode = 1;
}

async function main() {
  /* ------------------------------------------------------------------------ */
  /* arguments                                                                */
  /* ------------------------------------------------------------------------ */
  const DIR = flag("dir");
  const LEVEL = flag("as");
  const DRY_RUN = flag("dry-run") !== null;
  const MAX_PX = Number.parseInt(flag("max") ?? "640", 10) || 640;
  const QUALITY = Number.parseInt(flag("quality") ?? "82", 10) || 82;

  if (!DIR || !LEVEL || !LEVELS.includes(LEVEL)) {
    return fail(
      "Missing or unknown arguments.",
      "",
      '  --dir "D:\\\\TEDUHATI\\\\gambar\\\\domain"',
      `  --as  ${LEVELS.join(" | ")}`,
      "",
      "Optional: --max 640 --quality 82 --dry-run",
    );
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    return fail(
      "Missing Supabase credentials. Put them in .env.local:",
      "  NEXT_PUBLIC_SUPABASE_URL=https://<project>.supabase.co",
      "  SUPABASE_SERVICE_ROLE_KEY=<service_role key from Settings > API>",
    );
  }
  if (!key.startsWith("eyJ") || key.length < 100) {
    return fail(
      `SUPABASE_SERVICE_ROLE_KEY does not look like a key (got "${key.slice(0, 24)}...").`,
    );
  }

  /* ------------------------------------------------------------------------ */
  /* the folder has to exist and hold images                                  */
  /* ------------------------------------------------------------------------ */
  // Checked before touching the network, and answered with what to do rather
  // than a bare ENOENT. The usual cause is that the folder was never created:
  // the images come out of an image generator into Downloads, and the path in
  // the instructions was only an example.
  let entries;
  try {
    entries = await readdir(DIR, { withFileTypes: true });
  } catch (error) {
    if (error.code === "ENOENT") {
      return fail(
        `The folder ${DIR} does not exist.`,
        "",
        "Create it, put the generated images inside, and run this again:",
        `  mkdir "${DIR}"`,
        "",
        "The file names have to match the headings in docs/illustration-prompts.md",
        `(for --as ${LEVEL}: ${
          LEVEL === "domain"
            ? "motor.png, bahasa.png, …"
            : LEVEL === "band"
              ? "motor__m18_24.png, …"
              : "ACT-0042.png, …"
        }).`,
      );
    }
    return fail(`Cannot read ${DIR}: ${error.message}`);
  }
  if (entries.length === 0) {
    return fail(
      `${DIR} is empty.`,
      "Save the generated images there first — the file name is what decides",
      "where each one lands, so it has to match docs/illustration-prompts.md.",
    );
  }

  const supabase = createClient(url, key, { auth: { persistSession: false } });

  /* ------------------------------------------------------------------------ */
  /* what the database will accept                                            */
  /* ------------------------------------------------------------------------ */
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
    return fail("Could not read the taxonomy. Check the service role key.");
  }

  /* ------------------------------------------------------------------------ */
  /* files                                                                    */
  /* ------------------------------------------------------------------------ */
  async function walk(dir) {
    const out = [];
    const found = await readdir(dir, { withFileTypes: true });
    for (const entry of found) {
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
   * Returning a reason rather than throwing lets the run report every bad name
   * at once instead of stopping at the first, which matters when a batch of a
   * hundred came out of an image generator with slightly wrong filenames.
   */
  function targetFor(file) {
    const stem = basename(file, extname(file)).trim();

    if (LEVEL === "domain") {
      if (!domains.has(stem)) return { error: `"${stem}" is not a domain code` };
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
    return fail(
      `No PNG, JPEG or webp files under ${DIR}.`,
      `It holds ${entries.length} entr${entries.length === 1 ? "y" : "ies"}, but none of them is an image.`,
    );
  }

  const planned = [];
  const rejected = [];

  for (const file of files) {
    const target = targetFor(file);
    if (target.error) rejected.push(`${basename(file)}: ${target.error}`);
    else planned.push({ file, path: target.path });
  }

  if (rejected.length > 0) {
    const detail = [
      `\n${rejected.length} file(s) cannot be placed:\n`,
      ...rejected.map((r) => `  - ${r}`),
      "\nNothing was uploaded. An image at a path the ladder never looks at would",
      "be invisible: the bucket would grow and the activity would still show Tumi.",
    ];
    if (LEVEL === "domain") {
      detail.push(`\nDomain codes:\n${[...domains].sort().map((d) => `  ${d}`).join("\n")}`);
    }
    if (LEVEL === "band") {
      detail.push(`\nAge band codes:\n${[...bands].sort().map((b) => `  ${b}`).join("\n")}`);
    }
    return fail(...detail);
  }

  /* ------------------------------------------------------------------------ */
  /* run                                                                      */
  /* ------------------------------------------------------------------------ */
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
      const meta = await sharp(file).metadata();

      // Square, because ActivityImage renders into a square box with
      // object-cover: a 158x210 source would be scaled to fill that box and
      // have the top and bottom cropped off, which on this artwork means the
      // head. Padding to square makes the picture survive its own frame.
      //
      // The side is the source's own longest edge, capped at MAX_PX — not
      // MAX_PX itself. `contain` pads to whatever size it is given, so asking
      // for 640 from a 213px sticker would centre it in a 640px canvas and
      // leave the subject occupying a third of the frame: 32px of actual
      // drawing inside a 96px slot. Taking the longest edge pads only the
      // short side, and nothing is ever upscaled.
      const side = Math.min(MAX_PX, Math.max(meta.width ?? MAX_PX, meta.height ?? MAX_PX));

      webp = await sharp(file)
        .resize(side, side, {
          fit: "contain",
          background: { r: 0, g: 0, b: 0, alpha: 0 },
        })
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

  if (failed > 0) process.exitCode = 1;
}

await main();
