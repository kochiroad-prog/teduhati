/**
 * Supabase Storage URLs.
 *
 * Audio and illustration files live in public buckets, so a plain URL is enough
 * and no signed request is needed on every play. The bucket is expected to be
 * named `audio`, with paths matching `audio_tracks.file_path`.
 */

const BUCKET = "audio";

export function audioBucketUrl(): string | null {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!base) return null;
  return `${base.replace(/\/$/, "")}/storage/v1/object/public/${BUCKET}`;
}

export function publicFileUrl(bucket: string, path: string): string | null {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!base || !path) return null;
  return `${base.replace(/\/$/, "")}/storage/v1/object/public/${bucket}/${path}`;
}
