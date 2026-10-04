"use client";

import { useRef } from "react";
import type { Option } from "@/lib/admin/options";
import { cn } from "@/lib/utils";

/**
 * Search and filters for a content list.
 *
 * A plain GET form, so the filtered view has a URL that can be bookmarked,
 * shared with a colleague or linked from the action list on the overview. The
 * only JavaScript is the convenience of submitting on change; without it the
 * button still works.
 */

export type FilterSelect = {
  name: string;
  label: string;
  value: string;
  options: Option[];
  allLabel: string;
};

const SELECT_CLASS =
  "h-10 rounded-[12px] border border-line bg-white px-3 text-[0.9375rem] text-ink focus:border-sage focus:outline-none";

export function FilterBar({
  action,
  search,
  searchLabel,
  searchPlaceholder,
  selects,
  applyLabel,
  className,
}: {
  action: string;
  /** Omit to leave the search box out entirely rather than show a dead field. */
  search?: string;
  searchLabel?: string;
  searchPlaceholder?: string;
  selects: FilterSelect[];
  applyLabel: string;
  className?: string;
}) {
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <form
      ref={formRef}
      method="get"
      action={action}
      className={cn("mb-4 flex flex-wrap items-end gap-2", className)}
    >
      {search === undefined ? null : (
        <div className="min-w-[200px] flex-1">
          <label htmlFor="q" className="text-meta mb-1 block text-ink-faint">
            {searchLabel}
          </label>
          <input
            id="q"
            name="q"
            defaultValue={search}
            placeholder={searchPlaceholder}
            className="h-10 w-full rounded-[12px] border border-line bg-white px-3 text-[0.9375rem] text-ink placeholder:text-ink-faint focus:border-sage focus:outline-none"
          />
        </div>
      )}

      {selects.map((s) => (
        <div key={s.name}>
          <label htmlFor={s.name} className="text-meta mb-1 block text-ink-faint">
            {s.label}
          </label>
          <select
            id={s.name}
            name={s.name}
            defaultValue={s.value}
            onChange={() => formRef.current?.requestSubmit()}
            className={SELECT_CLASS}
          >
            <option value="">{s.allLabel}</option>
            {s.options.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
      ))}

      <button
        type="submit"
        className="h-10 rounded-pill bg-sage px-5 text-[0.9375rem] font-semibold text-white hover:bg-sage-dark"
      >
        {applyLabel}
      </button>
    </form>
  );
}
