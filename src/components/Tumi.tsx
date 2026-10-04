import { cn } from "@/lib/utils";

/**
 * Tumi — TEDUHATI's mascot.
 *
 * An original character: a small round seed-creature with a single sprout leaf.
 * Drawn as inline SVG rather than a raster asset so it stays crisp at any size,
 * recolours with the brand palette, and costs nothing to load.
 *
 * States mirror the ones in the production pipeline (idle, happy, sleepy,
 * thinking, excited, celebrate). When the Rive character ships, this component
 * is the fallback and the layout stays identical.
 */

export type TumiState =
  | "idle"
  | "happy"
  | "sleepy"
  | "thinking"
  | "excited"
  | "celebrate";

type Props = {
  state?: TumiState;
  size?: number;
  className?: string;
  /** Floating loop. Off by default; reduced-motion is respected globally. */
  float?: boolean;
};

export function Tumi({ state = "idle", size = 96, className, float = false }: Props) {
  const eyes = EYES[state];
  const mouth = MOUTH[state];

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 120 120"
      role="img"
      aria-label="Tumi"
      className={cn(float && "animate-float", className)}
    >
      {/* ground shadow: grounds the character so it doesn't look pasted on */}
      <ellipse cx="60" cy="108" rx="26" ry="5" fill="#273029" opacity="0.08" />

      {/* sprout: two leaves and a stem, the brand's growth motif */}
      <path
        d="M60 34 C60 26 60 20 60 16"
        stroke="#4e6b57"
        strokeWidth="3.5"
        strokeLinecap="round"
        fill="none"
      />
      <path
        d="M60 20 C52 20 45 15 44 8 C53 7 59 11 60 20 Z"
        fill="#6f8f78"
      />
      <path
        d="M60 25 C67 25 73 21 75 15 C67 14 61 17 60 25 Z"
        fill="#86a68d"
      />

      {/* body: a soft seed shape, wider at the base */}
      <path
        d="M60 32 C82 32 95 50 95 70 C95 92 80 104 60 104 C40 104 25 92 25 70 C25 50 38 32 60 32 Z"
        fill="#e9c96a"
      />
      {/* clay-like top light, giving the soft-clay feel without a gradient wash */}
      <path
        d="M60 32 C74 32 85 42 90 55 C78 48 68 45 60 45 C52 45 42 48 30 55 C35 42 46 32 60 32 Z"
        fill="#f2dba0"
        opacity="0.75"
      />

      {/* cheeks */}
      <ellipse cx="40" cy="76" rx="6" ry="4" fill="#b86f55" opacity="0.26" />
      <ellipse cx="80" cy="76" rx="6" ry="4" fill="#b86f55" opacity="0.26" />

      {eyes}
      {mouth}

      {/* celebrate: three small marks, not confetti spray */}
      {state === "celebrate" && (
        <g fill="#b86f55">
          <circle cx="22" cy="40" r="3" />
          <circle cx="98" cy="46" r="2.5" />
          <circle cx="30" cy="24" r="2" />
        </g>
      )}

      {/* sleepy: one small breath mark */}
      {state === "sleepy" && (
        <path
          d="M92 44 q6 -4 0 -8 q6 -4 0 -8"
          stroke="#8ca7b8"
          strokeWidth="2"
          fill="none"
          strokeLinecap="round"
        />
      )}
    </svg>
  );
}

const OPEN_EYES = (
  <g fill="#273029">
    <ellipse cx="48" cy="64" rx="4.2" ry="5.4" />
    <ellipse cx="72" cy="64" rx="4.2" ry="5.4" />
  </g>
);

const EYES: Record<TumiState, React.ReactNode> = {
  idle: OPEN_EYES,
  happy: OPEN_EYES,
  excited: (
    <g fill="#273029">
      <ellipse cx="48" cy="63" rx="5" ry="6.4" />
      <ellipse cx="72" cy="63" rx="5" ry="6.4" />
    </g>
  ),
  celebrate: (
    <g stroke="#273029" strokeWidth="3.2" strokeLinecap="round" fill="none">
      <path d="M43 66 q5 -7 10 0" />
      <path d="M67 66 q5 -7 10 0" />
    </g>
  ),
  sleepy: (
    <g stroke="#273029" strokeWidth="3.2" strokeLinecap="round" fill="none">
      <path d="M43 65 q5 4 10 0" />
      <path d="M67 65 q5 4 10 0" />
    </g>
  ),
  thinking: (
    <g fill="#273029">
      <ellipse cx="50" cy="62" rx="4.2" ry="5.4" />
      <ellipse cx="74" cy="62" rx="4.2" ry="5.4" />
    </g>
  ),
};

const MOUTH: Record<TumiState, React.ReactNode> = {
  idle: (
    <path
      d="M54 80 q6 4 12 0"
      stroke="#273029"
      strokeWidth="2.6"
      fill="none"
      strokeLinecap="round"
    />
  ),
  happy: (
    <path
      d="M51 79 q9 8 18 0"
      stroke="#273029"
      strokeWidth="2.8"
      fill="none"
      strokeLinecap="round"
    />
  ),
  excited: <ellipse cx="60" cy="82" rx="6" ry="7" fill="#273029" />,
  celebrate: <ellipse cx="60" cy="81" rx="7" ry="6" fill="#273029" />,
  sleepy: <ellipse cx="60" cy="82" rx="3.5" ry="4.5" fill="#273029" opacity="0.8" />,
  thinking: (
    <path
      d="M56 81 h9"
      stroke="#273029"
      strokeWidth="2.6"
      fill="none"
      strokeLinecap="round"
    />
  ),
};
