import { fill, type Dictionary } from "@/i18n/dictionaries";

/**
 * Age maths. Mirrors public.age_in_months in Postgres so the client and the
 * database never disagree about which band a child is in.
 */
export function ageInMonths(birthDate: string | Date, at: Date = new Date()): number {
  const birth = typeof birthDate === "string" ? parseDateOnly(birthDate) : birthDate;
  let months =
    (at.getFullYear() - birth.getFullYear()) * 12 + (at.getMonth() - birth.getMonth());
  if (at.getDate() < birth.getDate()) months -= 1;
  return Math.max(0, months);
}

/** Parses YYYY-MM-DD as a local date, avoiding the UTC shift of new Date(str). */
export function parseDateOnly(value: string): Date {
  const [y, m, d] = value.split("-").map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
}

export const AGE_BANDS = [
  { code: "m00_03", min: 0, max: 3, stage: "bonding" },
  { code: "m03_06", min: 3, max: 6, stage: "bonding" },
  { code: "m06_09", min: 6, max: 9, stage: "explore" },
  { code: "m09_12", min: 9, max: 12, stage: "explore" },
  { code: "m12_18", min: 12, max: 18, stage: "discover" },
  { code: "m18_24", min: 18, max: 24, stage: "discover" },
  { code: "m24_36", min: 24, max: 36, stage: "create" },
  { code: "m36_48", min: 36, max: 48, stage: "learn" },
  { code: "m48_60", min: 48, max: 60, stage: "ready" },
] as const;

export type AgeBandCode = (typeof AGE_BANDS)[number]["code"];

export function resolveAgeBand(months: number): AgeBandCode {
  const band = AGE_BANDS.find((b) => months >= b.min && months < b.max);
  // Past five, keep serving the oldest band rather than showing nothing.
  return band?.code ?? AGE_BANDS[AGE_BANDS.length - 1].code;
}

/** "19 bulan" under two, "2 tahun 7 bulan" after. */
export function formatAge(months: number, dict: Dictionary): string {
  if (months < 24) return fill(dict.child.ageMonths, { count: months });
  const years = Math.floor(months / 12);
  const rest = months % 12;
  if (rest === 0) return fill(dict.child.ageYearsOnly, { years });
  return fill(dict.child.ageYears, { years, months: rest });
}

/** Which greeting and which music mode suit the hour. */
export function timeOfDay(at: Date = new Date()): {
  greeting: keyof Dictionary["greeting"];
  musicMode: "morning" | "play" | "bonding" | "bedtime";
} {
  const h = at.getHours();
  if (h < 5) return { greeting: "night", musicMode: "bedtime" };
  if (h < 10) return { greeting: "morning", musicMode: "morning" };
  if (h < 15) return { greeting: "afternoon", musicMode: "play" };
  if (h < 18) return { greeting: "evening", musicMode: "play" };
  if (h < 20) return { greeting: "night", musicMode: "bonding" };
  return { greeting: "night", musicMode: "bedtime" };
}
