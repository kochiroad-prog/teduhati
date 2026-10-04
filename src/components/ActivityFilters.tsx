"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui";
import { href, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import type { DomainOption, MaterialOption } from "@/lib/queries";
import { cn } from "@/lib/utils";

/**
 * The filter row mirrors the recommendation pipeline in the database:
 * time, then area, then what the parent actually has at home.
 */
export function ActivityFilters({
  locale,
  domains,
  materials,
  selected,
}: {
  locale: Locale;
  domains: DomainOption[];
  materials: MaterialOption[];
  selected: { minutes: string | null; domain: string | null; materials: string[] };
}) {
  const dict = getDictionary(locale);
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [picked, setPicked] = useState<string[]>(selected.materials);

  const MINUTES = ["5", "10", "15", "30"];

  function go(next: Partial<{ menit: string | null; area: string | null; bahan: string[] }>) {
    const sp = new URLSearchParams();
    const minutes = next.menit !== undefined ? next.menit : selected.minutes;
    const domain = next.area !== undefined ? next.area : selected.domain;
    const mats = next.bahan !== undefined ? next.bahan : picked;

    if (minutes) sp.set("menit", minutes);
    if (domain) sp.set("area", domain);
    if (mats.length) sp.set("bahan", mats.join(","));

    const q = sp.toString();
    router.push(`${href(locale, "activities")}${q ? `?${q}` : ""}`);
  }

  const hasFilters =
    Boolean(selected.minutes) || Boolean(selected.domain) || selected.materials.length > 0;

  return (
    <div className="space-y-3">
      <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
        <FilterChip
          label={dict.activity.filterAny}
          on={!selected.minutes}
          onClick={() => go({ menit: null })}
        />
        {MINUTES.map((m) => (
          <FilterChip
            key={m}
            label={`${m} ${dict.activity.minutes}`}
            on={selected.minutes === m}
            onClick={() => go({ menit: m })}
          />
        ))}
      </div>

      <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
        {domains.map((d) => (
          <FilterChip
            key={d.code}
            label={d.name}
            on={selected.domain === d.code}
            onClick={() => go({ area: selected.domain === d.code ? null : d.code })}
          />
        ))}
      </div>

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="text-meta text-sage-dark hover:underline"
          aria-expanded={open}
        >
          {dict.activity.filterMaterials}
          {selected.materials.length > 0 ? ` (${selected.materials.length})` : ""}
        </button>
        {hasFilters ? (
          <button
            type="button"
            onClick={() => {
              setPicked([]);
              router.push(href(locale, "activities"));
            }}
            className="text-meta text-ink-faint hover:text-ink-muted"
          >
            {dict.activity.filterReset}
          </button>
        ) : null}
      </div>

      {open ? (
        <div className="surface p-4">
          <div className="flex flex-wrap gap-2">
            {materials
              .filter((m) => m.is_household)
              .map((m) => {
                const on = picked.includes(m.code);
                return (
                  <FilterChip
                    key={m.code}
                    label={m.name}
                    on={on}
                    onClick={() =>
                      setPicked((prev) =>
                        on ? prev.filter((c) => c !== m.code) : [...prev, m.code],
                      )
                    }
                  />
                );
              })}
          </div>
          <Button
            tone="secondary"
            onClick={() => {
              setOpen(false);
              go({ bahan: picked });
            }}
            className="mt-4 w-full"
          >
            {dict.activity.filterApply}
          </Button>
        </div>
      ) : null}
    </div>
  );
}

function FilterChip({
  label,
  on,
  onClick,
}: {
  label: string;
  on: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={on}
      className={cn(
        "text-meta shrink-0 rounded-pill border px-3.5 py-1.5 transition-colors",
        on
          ? "border-sage bg-sage text-white"
          : "border-line bg-white text-ink-muted hover:border-sage",
      )}
    >
      {label}
    </button>
  );
}
