import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { publicFileUrl } from "@/lib/storage";

/**
 * Which picture an activity gets.
 *
 * Three scales were considered — one image per domain, one per domain and age
 * band, one per activity — and the answer is all three, as a ladder. The most
 * specific file that actually exists wins:
 *
 *   activities/ACT-0001.webp         this activity's own picture
 *   bands/<domain>/<age_band>.webp   that domain at that age
 *   domains/<domain>.webp            that domain
 *   null                             the caller falls back to Tumi
 *
 * Ten files illustrate the whole library today; a specific picture dropped in
 * next month takes over for that one activity with no code change and no
 * database write.
 *
 * `activities.illustration_path` is deliberately not consulted. That column
 * holds 'activities/ACT-0001.webp' for all 100 rows while the bucket is empty —
 * the same trap the audio counter fell into, where a filled-in column was
 * mistaken for a file that exists. The only thing that settles this is the
 * bucket.
 */

const BUCKET = "illustrations";

/** Every object name in the bucket, fetched once per request. */
export const getIllustrationIndex = cache(async (): Promise<Set<string>> => {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("illustration_index");
    if (error || !Array.isArray(data)) return new Set();
    return new Set(data as string[]);
  } catch {
    // An illustration is decoration. If this fails the screen still works, it
    // just shows Tumi — never a broken image and never an error.
    return new Set();
  }
});

export type IllustrationSubject = {
  activityId: string;
  domain: string | null;
  ageBand: string | null;
};

/** The first rung that exists, or null to let the caller show the mascot. */
export function resolveIllustration(
  index: Set<string>,
  subject: IllustrationSubject,
): string | null {
  const candidates = [
    `activities/${subject.activityId}.webp`,
    subject.domain && subject.ageBand
      ? `bands/${subject.domain}/${subject.ageBand}.webp`
      : null,
    subject.domain ? `domains/${subject.domain}.webp` : null,
  ].filter((p): p is string => p !== null);

  for (const path of candidates) {
    if (index.has(path)) return publicFileUrl(BUCKET, path);
  }
  return null;
}

/**
 * Resolves a whole list in one go.
 *
 * The age band is not part of what `recommend_activities` returns, so the
 * middle rung would be unreachable on the activity list. One small query fills
 * it in rather than letting the list and the detail screen disagree about which
 * picture an activity has.
 */
export async function resolveForActivities(
  activityIds: string[],
): Promise<Map<string, string>> {
  const out = new Map<string, string>();
  if (activityIds.length === 0) return out;

  const [index, supabase] = await Promise.all([
    getIllustrationIndex(),
    createClient(),
  ]);
  if (index.size === 0) return out;

  const { data } = await supabase
    .from("activities")
    .select("id, primary_domain, age_band_code")
    .in("id", activityIds);

  for (const row of data ?? []) {
    const url = resolveIllustration(index, {
      activityId: row.id,
      domain: row.primary_domain,
      ageBand: row.age_band_code,
    });
    if (url) out.set(row.id, url);
  }
  return out;
}
