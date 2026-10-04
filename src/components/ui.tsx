import Link from "next/link";
import { cn } from "@/lib/utils";
import { swatch } from "@/lib/tokens";

/**
 * The whole component kit, in one file.
 *
 * Small enough to read in a sitting, which matters more here than one file per
 * component. Radius encodes hierarchy: pill for actions, plain card for
 * supporting surfaces, and the leaf shape only on the one card that leads.
 *
 * Colour utilities (bg-sage, text-ink, border-line, rounded-card…) are generated
 * by Tailwind from the @theme block in globals.css, so this file never hardcodes
 * a hex value except where an inline style is unavoidable.
 */

/* --------------------------------------------------------------------------
   Button
   -------------------------------------------------------------------------- */
type ButtonTone = "primary" | "secondary" | "quiet" | "danger";
type ButtonSize = "md" | "lg";

const TONE: Record<ButtonTone, string> = {
  primary: "bg-sage text-white hover:bg-sage-dark active:scale-[0.985]",
  secondary:
    "bg-white text-ink border border-line hover:border-sage active:scale-[0.985]",
  quiet: "text-ink-muted hover:text-ink hover:bg-black/[0.035]",
  danger: "text-terracotta border border-terracotta-soft hover:bg-terracotta-soft",
};

const SIZE: Record<ButtonSize, string> = {
  md: "h-11 px-5 text-[0.9375rem]",
  lg: "h-14 px-7 text-base",
};

const BUTTON_BASE =
  "inline-flex items-center justify-center gap-2 rounded-pill font-semibold transition-all duration-150 disabled:opacity-45 disabled:pointer-events-none select-none";

export function Button({
  tone = "primary",
  size = "md",
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  tone?: ButtonTone;
  size?: ButtonSize;
}) {
  return (
    <button className={cn(BUTTON_BASE, TONE[tone], SIZE[size], className)} {...props} />
  );
}

export function ButtonLink({
  tone = "primary",
  size = "md",
  className,
  ...props
}: React.ComponentProps<typeof Link> & { tone?: ButtonTone; size?: ButtonSize }) {
  return (
    <Link className={cn(BUTTON_BASE, TONE[tone], SIZE[size], className)} {...props} />
  );
}

/* --------------------------------------------------------------------------
   Surfaces
   -------------------------------------------------------------------------- */
export function Card({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("surface p-5", className)} {...props}>
      {children}
    </div>
  );
}

/** The one card per screen that leads. Leaf radius, warm fill, single shadow. */
export function LeafCard({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "leaf bg-sage-soft border border-[#c9d8cd] p-6 shadow-lift",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

/* --------------------------------------------------------------------------
   Chip — a label that carries data, not decoration.
   Domain colours come from the database as tokens, so this one needs inline
   style: the set of possible colours isn't known at build time.
   -------------------------------------------------------------------------- */
export function Chip({
  children,
  colorToken,
  className,
}: {
  children: React.ReactNode;
  colorToken?: string | null;
  className?: string;
}) {
  const c = swatch(colorToken);
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-pill px-3 py-1 text-meta",
        className,
      )}
      style={{ background: c.soft, color: c.ink, border: `1px solid ${c.line}` }}
    >
      {children}
    </span>
  );
}

export function Pill({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-pill bg-black/[0.045] px-3 py-1 text-meta text-ink-muted",
        className,
      )}
    >
      {children}
    </span>
  );
}

/* --------------------------------------------------------------------------
   Section heading — plain, no eyebrow label above it
   -------------------------------------------------------------------------- */
export function SectionHead({
  title,
  action,
}: {
  title: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-3 flex items-baseline justify-between gap-4">
      <h2 className="text-section">{title}</h2>
      {action}
    </div>
  );
}

/* --------------------------------------------------------------------------
   Empty state — an invitation, never a report of emptiness
   -------------------------------------------------------------------------- */
export function EmptyState({
  title,
  lead,
  action,
}: {
  title: string;
  lead: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="surface px-6 py-10 text-center">
      <p className="text-title">{title}</p>
      <p className="text-small mx-auto mt-2 max-w-[34ch] text-ink-muted">{lead}</p>
      {action ? <div className="mt-5 flex justify-center">{action}</div> : null}
    </div>
  );
}

/* --------------------------------------------------------------------------
   Form fields
   -------------------------------------------------------------------------- */
export function Field({
  label,
  help,
  children,
  htmlFor,
}: {
  label: string;
  help?: string;
  children: React.ReactNode;
  htmlFor?: string;
}) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={htmlFor} className="text-meta block text-ink">
        {label}
      </label>
      {children}
      {help ? <p className="text-small text-ink-faint">{help}</p> : null}
    </div>
  );
}

const INPUT_BASE =
  "w-full rounded-[14px] border border-line bg-white px-4 py-3 text-body text-ink placeholder:text-ink-faint focus:border-sage focus:outline-none";

export function Input({
  className,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(INPUT_BASE, className)} {...props} />;
}

export function Textarea({
  className,
  ...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea className={cn(INPUT_BASE, "min-h-28 resize-y", className)} {...props} />
  );
}

/* --------------------------------------------------------------------------
   Notice — safety notes and the garden disclaimer
   -------------------------------------------------------------------------- */
export function Notice({
  tone = "neutral",
  title,
  children,
}: {
  tone?: "neutral" | "care";
  title?: string;
  children: React.ReactNode;
}) {
  const care = tone === "care";
  return (
    <div
      className={cn(
        "rounded-[14px] border px-4 py-3",
        care ? "border-[#e0bdb0] bg-terracotta-soft" : "border-line bg-cream-deep",
      )}
    >
      {title ? (
        <p className={cn("text-meta mb-1", care ? "text-[#8f4f38]" : "text-ink-muted")}>
          {title}
        </p>
      ) : null}
      <div className="text-small text-ink-muted">{children}</div>
    </div>
  );
}

/* --------------------------------------------------------------------------
   Step counter for the guided activity flow.
   Numbered because the content genuinely is a sequence.
   -------------------------------------------------------------------------- */
export function StepDots({ total, current }: { total: number; current: number }) {
  return (
    <div className="flex items-center gap-1.5" aria-hidden="true">
      {Array.from({ length: total }, (_, i) => (
        <span
          key={i}
          className="h-1.5 rounded-full transition-all duration-200"
          style={{
            width: i === current ? 22 : 6,
            background: i <= current ? "var(--color-sage)" : "var(--color-line)",
          }}
        />
      ))}
    </div>
  );
}
