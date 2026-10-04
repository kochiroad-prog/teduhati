/**
 * Option lists and their types, with no server imports.
 *
 * This file exists because of a real build failure: the editors are client
 * components, and importing these from `taxonomy.ts` dragged the server-only
 * Supabase client into the browser bundle. The fixed vocabulary that comes from
 * the database lives in `taxonomy.ts` and is passed down as props; the fixed
 * vocabulary that comes from a Postgres enum lives here, because an enum cannot
 * change without a migration anyway.
 */

export type Option = { value: string; label: string; group?: string };

export type Taxonomy = {
  ageBands: Option[];
  domains: Option[];
  skills: Option[];
  materials: Option[];
};

export const MUSIC_MODES: Option[] = [
  { value: "morning", label: "Morning" },
  { value: "play", label: "Play" },
  { value: "bonding", label: "Bonding" },
  { value: "bedtime", label: "Bedtime" },
];

export const MOMENT_TYPES: Option[] = [
  { value: "morning", label: "Morning" },
  { value: "play", label: "Play" },
  { value: "meal", label: "Meal" },
  { value: "bath", label: "Bath" },
  { value: "outdoor", label: "Outdoor" },
  { value: "bedtime", label: "Bedtime" },
  { value: "anytime", label: "Anytime" },
];

export const AUDIO_KINDS: Option[] = [
  { value: "music", label: "Music" },
  { value: "sfx", label: "Sound effect" },
  { value: "signature", label: "Signature" },
];
