"use client";

import { createClient } from "@/lib/supabase/client";

/**
 * Uploading a file straight from the browser to Supabase Storage.
 *
 * This exists because of a real bug: the first version sent the file through a
 * server action, and Next.js caps a server action's request body at 1MB. A
 * normal MP3 is several megabytes, so the framework rejected the request before
 * any of our code ran — which is why the failure had no useful message, and why
 * the "under 15MB" rule the form advertised could never have been true.
 *
 * Raising `serverActions.bodySizeLimit` would have been the wrong fix: it routes
 * every byte through the server twice for no reason. The browser already holds a
 * signed-in staff session, and the storage policy already says staff may write
 * to these buckets, so the upload belongs on the client and the server only
 * records where the file landed.
 */

export type UploadOutcome =
  | { ok: true; path: string; bytes: number }
  | { ok: false; message: string };

export async function uploadToBucket(
  bucket: string,
  path: string,
  file: File,
  maxBytes: number,
  locale: "id" | "en",
): Promise<UploadOutcome> {
  if (file.size === 0) {
    return {
      ok: false,
      message: locale === "en" ? "That file is empty." : "Berkasnya kosong.",
    };
  }
  if (file.size > maxBytes) {
    const mb = Math.round(maxBytes / (1024 * 1024));
    return {
      ok: false,
      message:
        locale === "en"
          ? `That file is over ${mb}MB.`
          : `Berkasnya lebih dari ${mb}MB.`,
    };
  }

  const supabase = createClient();
  const { error } = await supabase.storage.from(bucket).upload(path, file, {
    upsert: true,
    contentType: file.type || "application/octet-stream",
  });

  if (error) {
    // A storage error here is almost always the policy refusing, which means
    // the person is signed in but not staff. Saying so beats "new row violates
    // row-level security policy".
    return {
      ok: false,
      message:
        locale === "en"
          ? `Upload refused: ${error.message}`
          : `Unggahan ditolak: ${error.message}`,
    };
  }

  return { ok: true, path, bytes: file.size };
}
