import Image from "next/image";
import { Tumi } from "@/components/Tumi";
import { cn } from "@/lib/utils";

/**
 * The picture on an activity.
 *
 * `src` comes from the illustration ladder, which only ever returns a path that
 * exists in the bucket — so this never renders a broken image. When there is no
 * picture at any rung it shows Tumi instead, which is the brand's own artwork
 * and reads as intended rather than as something missing.
 *
 * `unoptimized` because these are already small webp files in a public bucket;
 * routing them through the image optimiser would add a hop and a cache for no
 * gain, and Vercel bills for it.
 */
export function ActivityImage({
  src,
  alt,
  size = 64,
  className,
  priority = false,
}: {
  src: string | null;
  alt: string;
  size?: number;
  className?: string;
  priority?: boolean;
}) {
  if (!src) {
    return (
      <span
        className={cn(
          "flex shrink-0 items-center justify-center rounded-[14px] bg-sage-soft",
          className,
        )}
        style={{ width: size, height: size }}
      >
        <Tumi state="happy" size={Math.round(size * 0.78)} />
      </span>
    );
  }

  return (
    <Image
      src={src}
      alt={alt}
      width={size}
      height={size}
      priority={priority}
      unoptimized
      sizes={`${size}px`}
      style={{ width: size, height: size }}
      className={cn("shrink-0 rounded-[14px] object-cover", className)}
    />
  );
}
