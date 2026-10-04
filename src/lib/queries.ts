import { createClient } from "@/lib/supabase/server";
import type { Locale } from "@/i18n/config";
import type {
  ActivityRow,
  ActivityTranslationRow,
  AgeBandTranslationRow,
  AudioTrackRow,
  BondingOfDay,
  ChildGardenRow,
  ChildRow,
  DomainRow,
  DomainTranslationRow,
  MaterialTagRow,
  MaterialTagTranslationRow,
  PlanTier,
  ProfileRow,
  RecommendedActivity,
  StoryRow,
  StoryTranslationRow,
} from "@/types/db";

/**
 * Every read the app needs, in one place.
 *
 * All of these run on the server with the signed-in user's session, so RLS is
 * what enforces ownership and premium gating. None of them take a user id as an
 * argument: the session already says who is asking.
 */

export type Session = {
  userId: string;
  profile: ProfileRow | null;
  plan: PlanTier;
  children: ChildRow[];
};

export async function getSession(): Promise<Session | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const [profile, plan, children] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
    supabase.rpc("current_plan"),
    supabase
      .from("children")
      .select("*")
      .eq("is_archived", false)
      .order("created_at", { ascending: true }),
  ]);

  return {
    userId: user.id,
    profile: profile.data ?? null,
    plan: (plan.data as PlanTier | null) ?? "free",
    children: children.data ?? [],
  };
}

/** The child the parent is currently looking at: the one asked for, else the first. */
export function activeChild(session: Session, childId?: string): ChildRow | null {
  if (childId) {
    const match = session.children.find((c) => c.id === childId);
    if (match) return match;
  }
  return session.children[0] ?? null;
}

export async function getRecommendations(args: {
  childId: string;
  locale: Locale;
  limit?: number;
  maxMinutes?: number | null;
  materials?: string[] | null;
  domain?: string | null;
}): Promise<RecommendedActivity[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("recommend_activities", {
    p_child_id: args.childId,
    p_locale: args.locale,
    p_limit: args.limit ?? 3,
    p_max_minutes: args.maxMinutes ?? null,
    p_materials: args.materials ?? null,
    p_domain: args.domain ?? null,
  });

  if (error) {
    console.error("recommend_activities failed", error.message);
    return [];
  }
  return (data as RecommendedActivity[] | null) ?? [];
}

export type ActivityDetail = {
  activity: ActivityRow;
  text: ActivityTranslationRow;
  domainName: string | null;
  colorToken: string | null;
  materialNames: string[];
};

export async function getActivity(
  id: string,
  locale: Locale,
): Promise<ActivityDetail | null> {
  const supabase = await createClient();

  const [activityRes, textRes] = await Promise.all([
    supabase.from("activities").select("*").eq("id", id).maybeSingle(),
    supabase
      .from("activity_translations")
      .select("*")
      .eq("activity_id", id)
      .eq("locale", locale)
      .maybeSingle(),
  ]);

  const activity = activityRes.data;
  const text = textRes.data;
  if (!activity || !text) return null;

  const [domainRes, materialsRes] = await Promise.all([
    supabase
      .from("domains")
      .select("code, color_token")
      .eq("code", activity.primary_domain)
      .maybeSingle(),
    activity.materials.length
      ? supabase
          .from("material_tag_translations")
          .select("material_tag_code, name")
          .eq("locale", locale)
          .in("material_tag_code", activity.materials)
      : Promise.resolve({ data: [] as Pick<MaterialTagTranslationRow, "material_tag_code" | "name">[] }),
    ]);

  const domainNameRes = await supabase
    .from("domain_translations")
    .select("name")
    .eq("domain_code", activity.primary_domain)
    .eq("locale", locale)
    .maybeSingle();

  return {
    activity,
    text,
    domainName: domainNameRes.data?.name ?? null,
    colorToken: domainRes.data?.color_token ?? null,
    materialNames: (materialsRes.data ?? []).map((m) => m.name),
  };
}

export type GardenBed = ChildGardenRow & { name: string | null };

export async function getGarden(
  childId: string,
  locale: Locale,
): Promise<GardenBed[]> {
  const supabase = await createClient();

  const [bedsRes, namesRes] = await Promise.all([
    supabase
      .from("child_garden")
      .select("*")
      .eq("child_id", childId)
      .order("sort_order", { ascending: true }),
    supabase.from("domain_translations").select("domain_code, name").eq("locale", locale),
  ]);

  const names = new Map(
    (namesRes.data ?? []).map((n: Pick<DomainTranslationRow, "domain_code" | "name">) => [
      n.domain_code,
      n.name,
    ]),
  );

  return (bedsRes.data ?? []).map((bed) => ({
    ...bed,
    name: bed.domain_code ? names.get(bed.domain_code) ?? null : null,
  }));
}

export async function getBondingOfDay(
  childId: string,
  locale: Locale,
): Promise<BondingOfDay | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("bonding_moment_of_day", {
    p_child_id: childId,
    p_locale: locale,
  });
  if (error) {
    console.error("bonding_moment_of_day failed", error.message);
    return null;
  }
  const rows = (data as BondingOfDay[] | null) ?? [];
  return rows[0] ?? null;
}

export async function getBondingDoneToday(childId: string): Promise<Set<string>> {
  const supabase = await createClient();
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const { data } = await supabase
    .from("bonding_completions")
    .select("bonding_moment_id")
    .eq("child_id", childId)
    .gte("completed_at", startOfDay.toISOString());

  return new Set((data ?? []).map((r) => r.bonding_moment_id));
}

export type StoryCard = Pick<
  StoryRow,
  "id" | "reading_minutes" | "is_interactive" | "is_premium" | "theme"
> &
  Pick<StoryTranslationRow, "title" | "blurb">;

export async function getStoriesForAge(
  months: number,
  locale: Locale,
): Promise<StoryCard[]> {
  const supabase = await createClient();

  const { data: stories } = await supabase
    .from("stories")
    .select("id, reading_minutes, is_interactive, is_premium, theme")
    .lte("age_min_months", months)
    .gt("age_max_months", months)
    .eq("status", "published");

  if (!stories?.length) return [];

  const { data: texts } = await supabase
    .from("story_translations")
    .select("story_id, title, blurb")
    .eq("locale", locale)
    .in(
      "story_id",
      stories.map((s) => s.id),
    );

  const byId = new Map((texts ?? []).map((t) => [t.story_id, t]));

  return stories.flatMap((s) => {
    const t = byId.get(s.id);
    return t ? [{ ...s, title: t.title, blurb: t.blurb }] : [];
  });
}

export async function getMusic(): Promise<AudioTrackRow[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("audio_tracks")
    .select("*")
    .eq("kind", "music")
    .order("sort_order", { ascending: true });
  return data ?? [];
}

export type DomainOption = Pick<DomainRow, "code" | "color_token"> & { name: string };

export async function getDomainOptions(locale: Locale): Promise<DomainOption[]> {
  const supabase = await createClient();
  const [domainsRes, namesRes] = await Promise.all([
    supabase
      .from("domains")
      .select("code, color_token")
      .order("sort_order", { ascending: true }),
    supabase.from("domain_translations").select("domain_code, name").eq("locale", locale),
  ]);

  const names = new Map((namesRes.data ?? []).map((n) => [n.domain_code, n.name]));
  return (domainsRes.data ?? []).map((d) => ({
    ...d,
    name: names.get(d.code) ?? d.code,
  }));
}

export type MaterialOption = Pick<MaterialTagRow, "code" | "is_household"> & {
  name: string;
};

export async function getMaterialOptions(locale: Locale): Promise<MaterialOption[]> {
  const supabase = await createClient();
  const [tagsRes, namesRes] = await Promise.all([
    supabase
      .from("material_tags")
      .select("code, is_household")
      .order("sort_order", { ascending: true }),
    supabase
      .from("material_tag_translations")
      .select("material_tag_code, name")
      .eq("locale", locale),
  ]);

  const names = new Map(
    (namesRes.data ?? []).map((n) => [n.material_tag_code, n.name]),
  );
  return (tagsRes.data ?? []).map((t) => ({
    ...t,
    name: names.get(t.code) ?? t.code,
  }));
}

export async function getAgeBandLabel(
  bandCode: string,
  locale: Locale,
): Promise<AgeBandTranslationRow | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("age_band_translations")
    .select("*")
    .eq("age_band_code", bandCode)
    .eq("locale", locale)
    .maybeSingle();
  return data ?? null;
}

export async function getUsageThisMonth(): Promise<{
  ai_questions: number;
  stories_opened: number;
  activities_opened: number;
}> {
  const supabase = await createClient();
  const period = new Date();
  const key = `${period.getUTCFullYear()}-${String(period.getUTCMonth() + 1).padStart(2, "0")}-01`;

  const { data } = await supabase
    .from("usage_counters")
    .select("ai_questions, stories_opened, activities_opened")
    .eq("period", key)
    .maybeSingle();

  return data ?? { ai_questions: 0, stories_opened: 0, activities_opened: 0 };
}
