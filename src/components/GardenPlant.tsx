import { swatch } from "@/lib/tokens";
import type { GardenStage } from "@/lib/tokens";

/**
 * One bed of the Kebun Tumbuh.
 *
 * Five stages, each a different drawing rather than the same plant scaled up,
 * so growth reads at a glance without a number attached. The soil line stays
 * fixed across all five so a row of beds lines up.
 */

type Props = {
  stage: GardenStage;
  colorToken: string | null | undefined;
  size?: number;
};

export function GardenPlant({ stage, colorToken, size = 72 }: Props) {
  const c = swatch(colorToken);

  return (
    <svg width={size} height={size} viewBox="0 0 80 80" aria-hidden="true">
      {/* soil */}
      <path
        d="M8 62 h64 a4 4 0 0 1 4 4 v6 a4 4 0 0 1 -4 4 h-64 a4 4 0 0 1 -4 -4 v-6 a4 4 0 0 1 4 -4 z"
        fill={c.soft}
        stroke={c.line}
        strokeWidth="1"
      />

      {stage === "seed" && (
        <ellipse cx="40" cy="60" rx="6" ry="4.5" fill={c.ink} opacity="0.45" />
      )}

      {stage === "sprout" && (
        <>
          <path d="M40 62 V48" stroke={c.ink} strokeWidth="3" strokeLinecap="round" />
          <path d="M40 50 C33 50 28 46 27 40 C35 39 39 43 40 50 Z" fill={c.ink} />
        </>
      )}

      {stage === "plant" && (
        <>
          <path d="M40 62 V36" stroke={c.ink} strokeWidth="3.2" strokeLinecap="round" />
          <path d="M40 44 C31 44 25 39 24 32 C34 31 39 36 40 44 Z" fill={c.ink} />
          <path d="M40 38 C49 38 55 33 56 26 C46 25 41 30 40 38 Z" fill={c.ink} opacity="0.78" />
        </>
      )}

      {stage === "flower" && (
        <>
          <path d="M40 62 V30" stroke={c.ink} strokeWidth="3.2" strokeLinecap="round" />
          <path d="M40 46 C32 46 27 42 26 36 C34 35 39 39 40 46 Z" fill={c.ink} />
          <path d="M40 40 C48 40 53 36 54 30 C46 29 41 33 40 40 Z" fill={c.ink} opacity="0.78" />
          <g>
            <circle cx="40" cy="22" r="5.5" fill="#e9c96a" />
            <circle cx="33" cy="18" r="4.5" fill={c.ink} opacity="0.85" />
            <circle cx="47" cy="18" r="4.5" fill={c.ink} opacity="0.85" />
            <circle cx="36" cy="11" r="4.5" fill={c.ink} opacity="0.85" />
            <circle cx="44" cy="11" r="4.5" fill={c.ink} opacity="0.85" />
            <circle cx="40" cy="17" r="4" fill="#e9c96a" />
          </g>
        </>
      )}

      {stage === "tree" && (
        <>
          <path d="M40 62 V40" stroke="#8a6a4e" strokeWidth="5" strokeLinecap="round" />
          <path d="M40 50 L31 42" stroke="#8a6a4e" strokeWidth="3" strokeLinecap="round" />
          <path d="M40 46 L50 39" stroke="#8a6a4e" strokeWidth="3" strokeLinecap="round" />
          <circle cx="40" cy="26" r="15" fill={c.ink} />
          <circle cx="27" cy="33" r="9" fill={c.ink} opacity="0.85" />
          <circle cx="53" cy="33" r="9" fill={c.ink} opacity="0.85" />
          <circle cx="34" cy="22" r="3" fill="#f7ecc9" opacity="0.6" />
        </>
      )}
    </svg>
  );
}
