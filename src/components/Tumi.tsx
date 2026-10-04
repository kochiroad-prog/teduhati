import Image from "next/image";
import { TUMI } from "@/lib/assets";
import { cn } from "@/lib/utils";

/**
 * Tumi, the mascot.
 *
 * The artwork is the brand sticker sheet, so the character in the app is the
 * same one on the landing page and in the marketing material. Three poses exist;
 * the six states the product talks about map onto them, because a state with no
 * artwork is better served by a near neighbour than by a second, different-looking
 * mascot drawn to fill the gap.
 */

export type TumiState =
  | "idle"
  | "happy"
  | "sleepy"
  | "thinking"
  | "excited"
  | "celebrate";

const POSE: Record<TumiState, keyof typeof TUMI> = {
  idle: "happy",
  happy: "happy",
  excited: "happy",
  celebrate: "love",
  sleepy: "love", // eyes closed and content, which is what the sleepy state needs
  thinking: "reading",
};

export function Tumi({
  state = "idle",
  size = 96,
  className,
  float = false,
  priority = false,
}: {
  state?: TumiState;
  size?: number;
  className?: string;
  /** Gentle looping float. Reduced-motion is respected globally in globals.css. */
  float?: boolean;
  priority?: boolean;
}) {
  const asset = TUMI[POSE[state]];
  const height = Math.round((size * asset.height) / asset.width);

  return (
    <Image
      src={asset.src}
      alt={asset.alt}
      width={asset.width}
      height={asset.height}
      priority={priority}
      sizes={`${size}px`}
      style={{ width: size, height }}
      className={cn("object-contain", float && "animate-float", className)}
    />
  );
}
