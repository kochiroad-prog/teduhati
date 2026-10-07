#!/usr/bin/env node
/**
 * Empties the worksheet library: every row, every translation, every file.
 *
 * This exists because an import can leave the two out of step. The first
 * version of scripts/import-worksheets.mjs uploaded a file before inserting its
 * row, and when the insert failed the file stayed behind — 169 objects in the
 * bucket with nothing pointing at them. The importer now cleans up after
 * itself, but a bucket that is already in that state needs a way back to zero.
 *
 * Storage will not let SQL delete its rows ("Direct deletion from storage
 * tables is not allowed"), which is the right guard, so this goes through the
 * Storage API like any other client.
 *
 *   node --env-file-if-exists=.env.local scripts/reset-worksheets.mjs --yes
 *
 * Without --yes it only reports what it would remove.
 */

import { createClient } from "@supabase/supabase-js";

const CONFIRMED = process.argv.includes("--yes");

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

/** Storage lists one folder at a time, so the bucket is walked. */
async function listAll(prefix = "") {
  const out = [];
  let offset = 0;
  for (;;) {
    const { data, error } = await supabase.storage
      .from("worksheets")
      .list(prefix, { limit: 100, offset });
    if (error) {
      console.error(`Could not list "${prefix || "/"}": ${error.message}`);
      process.exit(1);
    }
    const page = data ?? [];
    for (const entry of page) {
      const path = prefix ? `${prefix}/${entry.name}` : entry.name;
      // A folder has no id of its own in Supabase Storage listings.
      if (entry.id === null) out.push(...(await listAll(path)));
      else out.push(path);
    }
    if (page.length < 100) break;
    offset += page.length;
  }
  return out;
}

const { count: rowCount, error: countError } = await supabase
  .from("worksheets")
  .select("id", { count: "exact", head: true });

if (countError) {
  console.error(`Could not count the worksheets: ${countError.message}`);
  process.exit(1);
}

const paths = await listAll();

console.log(
  `worksheets rows : ${rowCount ?? 0}\n` +
    `files in bucket : ${paths.length}\n`,
);

if (!CONFIRMED) {
  console.log("Nothing removed. Add --yes to actually empty it.");
  process.exit(0);
}

if (paths.length > 0) {
  // The API takes a bounded list, so the removal is chunked.
  for (let i = 0; i < paths.length; i += 100) {
    const chunk = paths.slice(i, i + 100);
    const { error } = await supabase.storage.from("worksheets").remove(chunk);
    if (error) {
      console.error(`Removing files failed at ${i}: ${error.message}`);
      process.exit(1);
    }
  }
  console.log(`${paths.length} file(s) removed.`);
}

// Translations go first: they reference the rows.
const { error: trError } = await supabase
  .from("worksheet_translations")
  .delete()
  .neq("worksheet_id", "");
if (trError) {
  console.error(`Removing translations failed: ${trError.message}`);
  process.exit(1);
}

const { error: rowError } = await supabase.from("worksheets").delete().neq("id", "");
if (rowError) {
  console.error(`Removing rows failed: ${rowError.message}`);
  process.exit(1);
}

console.log(`${rowCount ?? 0} row(s) removed.\n\nEmpty. Run the import again.`);
