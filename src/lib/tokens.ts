/**
 * Domain colour mapping.
 *
 * The database stores a colour *token* per domain, not a hex value, so a
 * rebrand changes CSS and nothing else. This file is the only place that knows
 * how a token becomes a class.
 */

export type ColorToken =
  | "sage"
  | "yellow"
  | "terracotta"
  | "dusty_blue"
  | "clay"
  | "plum";

type Swatch = {
  /** Strong version: plant stems, filled chips, icon strokes. */
  ink: string;
  /** Tinted background: chips, garden beds, progress fills. */
  soft: string;
  /** Border that reads on the soft background. */
  line: string;
};

export const SWATCHES: Record<ColorToken, Swatch> = {
  sage:       { ink: "#6f8f78", soft: "#dfe8e0", line: "#c3d4c7" },
  yellow:     { ink: "#c9a13c", soft: "#f7ecc9", line: "#e6d49a" },
  terracotta: { ink: "#b86f55", soft: "#f2dfd7", line: "#e0bdb0" },
  dusty_blue: { ink: "#6f8ea3", soft: "#e0e9ef", line: "#bed0db" },
  clay:       { ink: "#b2825f", soft: "#f1e3d6", line: "#dec6ae" },
  plum:       { ink: "#8a6786", soft: "#ebe0ea", line: "#d4bdd2" },
};

export function swatch(token: string | null | undefined): Swatch {
  if (token && token in SWATCHES) return SWATCHES[token as ColorToken];
  return SWATCHES.sage;
}

/** Garden stages, in order. The view in Postgres returns one of these. */
export const GARDEN_STAGES = ["seed", "sprout", "plant", "flower", "tree"] as const;
export type GardenStage = (typeof GARDEN_STAGES)[number];

export function stageIndex(stage: string): number {
  const i = (GARDEN_STAGES as readonly string[]).indexOf(stage);
  return i < 0 ? 0 : i;
}

/** How many completions the next stage needs. Mirrors the SQL in child_garden. */
export const STAGE_THRESHOLDS: Record<GardenStage, number | null> = {
  seed: 1,
  sprout: 3,
  plant: 6,
  flower: 10,
  tree: null,
};
