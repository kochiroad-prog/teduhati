/**
 * Database types.
 *
 * Hand-maintained and kept narrow on purpose: it covers the tables, the view
 * and the RPCs the app actually calls, which is what makes queries type-safe.
 * To replace it with the full generated set (every table, every relationship):
 *
 *   npm run db:types
 *
 * That overwrites this file, so re-read the comment above before committing.
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type ContentStatus = "draft" | "review" | "published" | "retired";
export type MusicMode = "morning" | "play" | "bonding" | "bedtime";
export type AudioKind = "music" | "sfx" | "signature";
export type PlanTier = "free" | "premium" | "annual";
export type SubscriptionStatus =
  | "active"
  | "past_due"
  | "canceled"
  | "expired"
  | "trialing";
export type BondingMomentType =
  | "morning"
  | "play"
  | "meal"
  | "bath"
  | "outdoor"
  | "bedtime"
  | "anytime";

/** One step of a guided activity. Stored as jsonb, so it is validated on read. */
export type ActivityStep = { title: string; body: string };

/** One page of a story. `choices` turns a page into an interactive branch. */
export type StoryPage = {
  text: string;
  speaker?: string;
  choices?: { label: string; sound?: string }[];
};

/**
 * `Relationships` is not decoration: the PostgREST type parser in supabase-js
 * reads it when it resolves a `select()` string, and every table resolves to
 * `never` without it.
 */
type Row<T> = {
  Row: T;
  Insert: Partial<T> & object;
  Update: Partial<T>;
  Relationships: [];
};

export type UserRole = "parent" | "editor" | "admin";

export type OrderStatus =
  | "awaiting_payment"
  | "awaiting_confirmation"
  | "paid"
  | "rejected"
  | "expired"
  | "cancelled";

export type OrderRow = {
  id: string;
  reference: string;
  user_id: string;
  plan: Exclude<PlanTier, "free">;
  amount: number;
  unique_suffix: number;
  total: number;
  status: OrderStatus;
  provider: string;
  external_id: string | null;
  payer_note: string | null;
  proof_path: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  review_note: string | null;
  expires_at: string;
  created_at: string;
  updated_at: string;
};

/**
 * What `admin_overview()` returns.
 *
 * Every moving figure carries its previous period alongside it, because a count
 * on its own does not say whether things are getting better. The three fields at
 * the end are the action list: each one means an admin has something to fix.
 */
export type AdminOverview = {
  parents: number;
  children: number;
  active_subs: number;
  orders_pending: number;
  mrr: number;
  completions_7d: number;
  completions_prev_7d: number;
  ai_questions_month: number;
  activities_published: number;
  activities_draft: number;
  activities_total: number;
  stories_published: number;
  stories_total: number;
  bonding_published: number;
  bonding_total: number;
  worksheets_total: number;
  worksheets_published: number;
  worksheets_draft: number;
  audio_total: number;
  audio_missing_file: number;
  signups_7d: number;
  signups_prev_7d: number;
  signups_30d: number;
  revenue_30d: number;
  revenue_prev_30d: number;
  needs_safety_note: number;
  missing_translation: number;
  bank_configured: boolean;
};

export type AdminDailyRow = { day: string; signups: number; completions: number };

/** Where parents stop. The gap between two steps is the thing worth reading. */
export type AdminFunnel = {
  signed_up: number;
  added_child: number;
  did_one: number;
  did_three: number;
  started_order: number;
  paid: number;
};

export type AdminTopActivity = {
  activity_id: string;
  title: string;
  domain_code: string;
  completions: number;
  avg_rating: number | null;
};

export type AdminDomainCoverage = {
  domain_code: string;
  name: string | null;
  published: number;
  completions: number;
};

export type AdminRevenueRow = { month: string; orders: number; revenue: number };

export type AdminUserRow = {
  id: string;
  email: string | null;
  display_name: string | null;
  role: UserRole;
  locale: string;
  plan: PlanTier;
  plan_expires_at: string | null;
  children: number;
  completions: number;
  last_seen: string | null;
  created_at: string;
};

/** What a parent of a given age sees on their first day. */
export type PreviewActivity = {
  activity_id: string;
  title: string;
  summary: string;
  duration_minutes: number;
  primary_domain: string;
  domain_name: string | null;
  difficulty: number;
  is_premium: boolean;
  illustration_path: string | null;
  age_min_months: number;
  age_max_months: number;
};

export type PreviewBonding = {
  bonding_moment_id: string;
  title: string;
  prompt: string;
  why_it_matters: string;
  moment_type: BondingMomentType;
  duration_minutes: number;
  is_premium: boolean;
};

export type PreviewWorksheet = {
  worksheet_id: string;
  title: string;
  description: string;
  primary_domain: string;
  page_count: number;
  is_premium: boolean;
};

export type PreviewStory = {
  story_id: string;
  title: string;
  blurb: string;
  theme: string;
  reading_minutes: number;
  is_premium: boolean;
};

/** The gaps are the point: an age with no stories is a hole in the product. */
export type PreviewCounts = {
  activities: number;
  activities_free: number;
  bonding: number;
  stories: number;
  worksheets: number;
  band: string | null;
};

/**
 * Whether a track's object actually exists in the bucket.
 *
 * `audio_tracks.file_path` cannot answer this: the taxonomy seed filled it in
 * for files nobody had uploaded, so a non-null path proves nothing.
 */
export type AudioStatusRow = {
  id: string;
  file_path: string | null;
  has_object: boolean;
};

/** How far the illustration ladder actually reaches, counted against files. */
export type IllustrationCoverage = {
  files: number;
  total: number;
  specific: number;
  band: number;
  domain: number;
  none: number;
  domains_covered: number;
  domains_total: number;
};

export type AppSettingRow = {
  key: string;
  value: Json;
  is_public: boolean;
  label: string | null;
  description: string | null;
  updated_by: string | null;
  updated_at: string;
};

export type AuditLogRow = {
  id: number;
  actor_id: string | null;
  actor_email: string | null;
  action: string;
  object_type: string;
  object_id: string | null;
  summary: string | null;
  before: Json | null;
  after: Json | null;
  created_at: string;
};

export type WorksheetRow = {
  id: string;
  age_min_months: number;
  age_max_months: number;
  primary_domain: string;
  page_count: number;
  file_path: string | null;
  preview_path: string | null;
  status: ContentStatus;
  is_premium: boolean;
  /** Size of the PDF, so the list can warn about a sheet nobody will wait for. */
  file_bytes: number | null;
  /** The filename it arrived as, which is how a re-import recognises it. */
  source_name: string | null;
  sort_order: number;
  skill_codes: string[];
  created_at: string;
  updated_at: string;
};

export type WorksheetForChild = {
  worksheet_id: string;
  title: string;
  description: string;
  primary_domain: string;
  page_count: number;
  is_premium: boolean;
  preview_path: string | null;
};

export type WorksheetTranslationRow = {
  worksheet_id: string;
  locale: string;
  title: string;
  description: string;
};

export type ProfileRow = {
  id: string;
  role: UserRole;
  display_name: string | null;
  parent_role: string | null;
  locale: string;
  timezone: string;
  onboarded_at: string | null;
  created_at: string;
  updated_at: string;
};

export type ChildRow = {
  id: string;
  user_id: string;
  name: string;
  birth_date: string;
  interests: string[];
  avatar_seed: number;
  notes: string | null;
  is_archived: boolean;
  created_at: string;
  updated_at: string;
};

export type ActivityRow = {
  id: string;
  age_min_months: number;
  age_max_months: number;
  age_band_code: string;
  primary_domain: string;
  secondary_domains: string[];
  skill_codes: string[];
  duration_minutes: number;
  difficulty: number;
  materials: string[];
  no_materials: boolean;
  screen_free: boolean;
  needs_supervision: boolean;
  bonding_level: number;
  music_mode: MusicMode | null;
  illustration_path: string | null;
  character_animation: string;
  completion_sound: string;
  source_reference: string | null;
  status: ContentStatus;
  is_premium: boolean;
  reviewed_by_expert: boolean;
  created_at: string;
  updated_at: string;
};

export type ActivityTranslationRow = {
  activity_id: string;
  locale: string;
  title: string;
  summary: string;
  learning_goal: string;
  steps: Json;
  parent_tip: string | null;
  safety_notes: string | null;
  variations: string[];
  materials_text: string | null;
};

export type ActivityCompletionRow = {
  id: string;
  child_id: string;
  activity_id: string;
  completed_at: string;
  rating: number | null;
  child_mood: "loved_it" | "okay" | "not_today" | null;
  actual_minutes: number | null;
  note: string | null;
};

export type BondingMomentRow = {
  id: string;
  age_min_months: number;
  age_max_months: number;
  moment_type: BondingMomentType;
  duration_minutes: number;
  music_mode: MusicMode | null;
  character_animation: string;
  status: ContentStatus;
  is_premium: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

export type BondingMomentTranslationRow = {
  bonding_moment_id: string;
  locale: string;
  title: string;
  prompt: string;
  why_it_matters: string;
};

export type StoryRow = {
  id: string;
  age_min_months: number;
  age_max_months: number;
  theme: string;
  is_interactive: boolean;
  reading_minutes: number;
  music_mode: MusicMode | null;
  cover_path: string | null;
  status: ContentStatus;
  is_premium: boolean;
  created_at: string;
  updated_at: string;
};

export type StoryTranslationRow = {
  story_id: string;
  locale: string;
  title: string;
  blurb: string;
  pages: Json;
};

export type DomainRow = {
  code: string;
  color_token: string;
  icon_key: string;
  in_garden: boolean;
  garden_domain: string | null;
  sort_order: number;
};

export type DomainTranslationRow = {
  domain_code: string;
  locale: string;
  name: string;
  description: string;
};

export type AgeBandRow = {
  code: string;
  age_min_months: number;
  age_max_months: number;
  stage_key: string;
  sort_order: number;
};

export type AgeBandTranslationRow = {
  age_band_code: string;
  locale: string;
  name: string;
  stage_name: string;
  focus: string;
};

export type MaterialTagRow = {
  code: string;
  is_household: boolean;
  sort_order: number;
};

export type MaterialTagTranslationRow = {
  material_tag_code: string;
  locale: string;
  name: string;
};

export type AudioTrackRow = {
  id: string;
  kind: AudioKind;
  mode: MusicMode | null;
  title: string;
  bpm_min: number | null;
  bpm_max: number | null;
  duration_seconds: number | null;
  instruments: string[];
  file_path: string | null;
  is_loop: boolean;
  is_premium: boolean;
  license_note: string | null;
  sort_order: number;
};

export type SubscriptionRow = {
  id: string;
  user_id: string;
  plan: PlanTier;
  status: SubscriptionStatus;
  provider: string | null;
  external_id: string | null;
  started_at: string;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
};

export type UsageCounterRow = {
  user_id: string;
  period: string;
  ai_questions: number;
  stories_opened: number;
  activities_opened: number;
  updated_at: string;
};

export type AiConversationRow = {
  id: string;
  user_id: string;
  child_id: string | null;
  question: string;
  answer: string;
  locale: string;
  provider: string | null;
  model: string | null;
  input_tokens: number | null;
  output_tokens: number | null;
  created_at: string;
};

export type ChildGardenRow = {
  child_id: string | null;
  domain_code: string | null;
  sort_order: number | null;
  color_token: string | null;
  done_count: number | null;
  stage: string | null;
  last_done: string | null;
};

export type RecommendedActivity = {
  activity_id: string;
  title: string;
  summary: string;
  duration_minutes: number;
  primary_domain: string;
  domain_name: string | null;
  difficulty: number;
  is_premium: boolean;
  illustration_path: string | null;
  score: number;
};

export type BondingOfDay = {
  bonding_moment_id: string;
  title: string;
  prompt: string;
  why_it_matters: string;
  moment_type: BondingMomentType;
  duration_minutes: number;
};

export type Database = {
  __InternalSupabase: { PostgrestVersion: "14.18" };
  public: {
    Tables: {
      profiles: Row<ProfileRow>;
      orders: Row<OrderRow>;
      children: Row<ChildRow>;
      activities: Row<ActivityRow>;
      activity_translations: Row<ActivityTranslationRow>;
      activity_completions: Row<ActivityCompletionRow>;
      bonding_moments: Row<BondingMomentRow>;
      bonding_moment_translations: Row<BondingMomentTranslationRow>;
      bonding_completions: Row<{
        id: string;
        child_id: string;
        bonding_moment_id: string;
        completed_at: string;
      }>;
      stories: Row<StoryRow>;
      story_translations: Row<StoryTranslationRow>;
      worksheets: Row<WorksheetRow>;
      worksheet_translations: Row<WorksheetTranslationRow>;
      app_settings: Row<AppSettingRow>;
      audit_log: Row<AuditLogRow>;
      story_reads: Row<{
        id: string;
        child_id: string;
        story_id: string;
        read_at: string;
        finished: boolean;
      }>;
      domains: Row<DomainRow>;
      domain_translations: Row<DomainTranslationRow>;
      age_bands: Row<AgeBandRow>;
      age_band_translations: Row<AgeBandTranslationRow>;
      material_tags: Row<MaterialTagRow>;
      material_tag_translations: Row<MaterialTagTranslationRow>;
      skills: Row<{ code: string; domain_code: string; sort_order: number }>;
      skill_translations: Row<{ skill_code: string; locale: string; name: string }>;
      audio_tracks: Row<AudioTrackRow>;
      subscriptions: Row<SubscriptionRow>;
      usage_counters: Row<UsageCounterRow>;
      ai_conversations: Row<AiConversationRow>;
      locales: Row<{
        code: string;
        label: string;
        is_default: boolean;
        sort_order: number;
      }>;
    };
    Views: {
      child_garden: { Row: ChildGardenRow; Relationships: [] };
    };
    Functions: {
      age_in_months: { Args: { birth_date: string; at_date?: string }; Returns: number };
      resolve_age_band: { Args: { months: number }; Returns: string };
      current_plan: { Args: { p_user_id?: string }; Returns: PlanTier };
      has_premium: { Args: { p_user_id?: string }; Returns: boolean };
      bump_usage: { Args: { p_field: string; p_delta?: number }; Returns: number };
      owns_child: { Args: { p_child_id: string }; Returns: boolean };
      recommend_activities: {
        Args: {
          p_child_id: string;
          p_locale?: string;
          p_limit?: number;
          p_max_minutes?: number | null;
          p_materials?: string[] | null;
          p_domain?: string | null;
          p_include_premium?: boolean | null;
        };
        Returns: RecommendedActivity[];
      };
      bonding_moment_of_day: {
        Args: { p_child_id: string; p_locale?: string };
        Returns: BondingOfDay[];
      };
      is_staff: { Args: { p_user_id?: string }; Returns: boolean };
      is_admin: { Args: { p_user_id?: string }; Returns: boolean };
      admin_overview: { Args: Record<string, never>; Returns: AdminOverview | null };
      admin_daily: { Args: { p_days?: number }; Returns: AdminDailyRow[] };
      approve_order: { Args: { p_order_id: string; p_note?: string }; Returns: OrderRow };
      reject_order: { Args: { p_order_id: string; p_note?: string }; Returns: OrderRow };
      admin_funnel: { Args: { p_days?: number }; Returns: AdminFunnel | null };
      admin_top_activities: {
        Args: { p_days?: number; p_limit?: number };
        Returns: AdminTopActivity[];
      };
      admin_domain_coverage: {
        Args: Record<string, never>;
        Returns: AdminDomainCoverage[];
      };
      admin_revenue_monthly: { Args: { p_months?: number }; Returns: AdminRevenueRow[] };
      admin_users: {
        Args: { p_search?: string | null; p_limit?: number; p_offset?: number };
        Returns: AdminUserRow[];
      };
      public_settings: { Args: Record<string, never>; Returns: Json };
      set_setting: { Args: { p_key: string; p_value: Json }; Returns: AppSettingRow };
      validate_activity: { Args: { p_id: string }; Returns: string[] };
      validate_story: { Args: { p_id: string }; Returns: string[] };
      validate_bonding: { Args: { p_id: string }; Returns: string[] };
      validate_worksheet: { Args: { p_id: string }; Returns: string[] };
      /** Raises rather than returning null when the caller may not download. */
      worksheet_path_for_download: { Args: { p_id: string }; Returns: string };
      admin_preview_activities: {
        Args: {
          p_months: number;
          p_locale?: string;
          p_limit?: number;
          p_include_premium?: boolean;
        };
        Returns: PreviewActivity[];
      };
      admin_preview_bonding: {
        Args: { p_months: number; p_locale?: string; p_limit?: number };
        Returns: PreviewBonding[];
      };
      admin_preview_worksheets: {
        Args: { p_months: number; p_locale?: string; p_limit?: number };
        Returns: PreviewWorksheet[];
      };
      admin_preview_stories: {
        Args: { p_months: number; p_locale?: string; p_limit?: number };
        Returns: PreviewStory[];
      };
      admin_preview_counts: { Args: { p_months: number }; Returns: PreviewCounts | null };
      admin_audio_status: { Args: Record<string, never>; Returns: AudioStatusRow[] };
      /** Object names in the illustrations bucket, so the ladder can resolve. */
      illustration_index: { Args: Record<string, never>; Returns: string[] };
      admin_illustration_coverage: {
        Args: Record<string, never>;
        Returns: IllustrationCoverage | null;
      };
      admin_search_activity_ids: {
        Args: { p_q: string; p_locale?: string };
        Returns: string[];
      };
      admin_bulk_update_worksheets: {
        Args: {
          p_ids: string[];
          p_domain?: string | null;
          p_age_min?: number | null;
          p_age_max?: number | null;
          p_is_premium?: boolean | null;
        };
        Returns: number;
      };
      worksheets_for_child: {
        Args: { p_child_id: string; p_locale?: string; p_limit?: number };
        Returns: WorksheetForChild[];
      };
      /** Returns the problems that stopped a publish, or an empty array on success. */
      set_content_status: {
        Args: { p_table: string; p_id: string; p_status: ContentStatus };
        Returns: string[];
      };
      next_content_id: { Args: { p_table: string }; Returns: string };
      set_user_role: { Args: { p_user_id: string; p_role: UserRole }; Returns: ProfileRow };
      grant_premium: {
        Args: {
          p_user_id: string;
          p_plan?: PlanTier;
          p_months?: number;
          p_note?: string | null;
        };
        Returns: SubscriptionRow;
      };
      cancel_subscription: {
        Args: { p_subscription_id: string; p_note?: string | null };
        Returns: SubscriptionRow;
      };
      log_audit: {
        Args: {
          p_action: string;
          p_object_type: string;
          p_object_id?: string | null;
          p_summary?: string | null;
          p_before?: Json | null;
          p_after?: Json | null;
        };
        Returns: number;
      };
    };
    Enums: {
      content_status: ContentStatus;
      music_mode: MusicMode;
      audio_kind: AudioKind;
      plan_tier: PlanTier;
      subscription_status: SubscriptionStatus;
      bonding_moment_type: BondingMomentType;
      user_role: UserRole;
      order_status: OrderStatus;
    };
    CompositeTypes: Record<never, never>;
  };
};

/** Narrows the jsonb `steps` column into usable steps, dropping malformed rows. */
export function parseSteps(value: Json): ActivityStep[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((entry) => {
    if (typeof entry !== "object" || entry === null || Array.isArray(entry)) return [];
    const title = (entry as Record<string, unknown>).title;
    const body = (entry as Record<string, unknown>).body;
    if (typeof title !== "string" || typeof body !== "string") return [];
    return [{ title, body }];
  });
}

/** Same guard for story pages. */
export function parsePages(value: Json): StoryPage[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((entry) => {
    if (typeof entry !== "object" || entry === null || Array.isArray(entry)) return [];
    const rec = entry as Record<string, unknown>;
    if (typeof rec.text !== "string") return [];
    const page: StoryPage = { text: rec.text };
    if (typeof rec.speaker === "string") page.speaker = rec.speaker;
    if (Array.isArray(rec.choices)) {
      page.choices = rec.choices.flatMap((c) => {
        if (typeof c !== "object" || c === null || Array.isArray(c)) return [];
        const label = (c as Record<string, unknown>).label;
        if (typeof label !== "string") return [];
        const sound = (c as Record<string, unknown>).sound;
        return [typeof sound === "string" ? { label, sound } : { label }];
      });
    }
    return [page];
  });
}
