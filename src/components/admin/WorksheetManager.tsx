"use client";

import { Fragment, useState, useTransition } from "react";
import { Button, Field, Input, Notice, Textarea } from "@/components/ui";
import {
  Problems,
  StatusBadge,
  TableFrame,
  Td,
  Th,
  fmtDate,
  fmtNumber,
} from "@/components/admin/parts";
import type { Locale } from "@/i18n/config";
import { adminCopy } from "@/lib/admin/copy";
import { setContentStatus } from "@/lib/admin-actions";
import { saveWorksheet, worksheetDownloadUrl } from "@/lib/worksheet-actions";
import type { Option } from "@/lib/admin/options";
import type { WorksheetRow, WorksheetTranslationRow } from "@/types/db";
import { cn } from "@/lib/utils";

/**
 * The worksheet library.
 *
 * Rows arrive from the importer as drafts with a title guessed from the
 * filename, so the work here is correcting the age range, the domain and the
 * wording — then publishing. The database refuses to publish a sheet with no
 * file or a missing language, and says which, so this screen never has to
 * guess what is wrong.
 *
 * The preview link is a signed URL that a staff member fetches on demand, the
 * same path a paying parent takes. There is no second, laxer route for staff:
 * if the download is broken for a parent, it is broken here too, which is how
 * it gets noticed before release.
 */

const SELECT_CLASS =
  "w-full rounded-[12px] border border-line bg-white px-3 py-2 text-[0.9375rem] text-ink focus:border-sage focus:outline-none";

type Joined = WorksheetRow & { worksheet_translations: WorksheetTranslationRow[] };

function Row({
  locale,
  row,
  domains,
  canPublish,
  onMessage,
}: {
  locale: Locale;
  row: Joined;
  domains: Option[];
  canPublish: boolean;
  onMessage: (m: { ok: boolean; text: string }) => void;
}) {
  const t = adminCopy(locale);
  const [open, setOpen] = useState(false);
  const [problems, setProblems] = useState<string[]>([]);
  const [pending, start] = useTransition();

  const tr = {
    id: row.worksheet_translations.find((r) => r.locale === "id") ?? null,
    en: row.worksheet_translations.find((r) => r.locale === "en") ?? null,
  };

  function save(data: FormData) {
    start(async () => {
      const r = await saveWorksheet(data);
      onMessage({ ok: r.ok, text: r.ok ? t.common.saved : r.message });
    });
  }

  function publish(next: "published" | "draft") {
    const data = new FormData();
    data.set("locale", locale);
    data.set("table", "worksheets");
    data.set("id", row.id);
    data.set("status", next);
    start(async () => {
      setProblems([]);
      const r = await setContentStatus(data);
      if (r.ok) onMessage({ ok: true, text: t.common.saved });
      else {
        setProblems(r.problems ?? []);
        if (!r.problems?.length) onMessage({ ok: false, text: r.message });
      }
    });
  }

  function preview() {
    start(async () => {
      const r = await worksheetDownloadUrl(row.id, locale);
      if (r.ok) window.open(r.url, "_blank", "noopener,noreferrer");
      else onMessage({ ok: false, text: r.message });
    });
  }

  return (
    <Fragment>
      <tr className="transition-colors hover:bg-black/[0.015]">
        <Td className="font-mono text-[0.8125rem] text-ink-faint">{row.id}</Td>
        <Td>
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            className="text-left font-medium hover:text-sage-dark hover:underline"
          >
            {tr.id?.title ?? row.id}
          </button>
          {row.source_name ? (
            <span className="text-meta mt-0.5 block max-w-[42ch] truncate text-ink-faint">
              {row.source_name}
            </span>
          ) : null}
        </Td>
        <Td className="text-ink-muted">{row.primary_domain}</Td>
        <Td className="whitespace-nowrap text-ink-muted">
          {row.age_min_months}–{row.age_max_months}
        </Td>
        <Td numeric className="text-ink-muted">
          {row.file_bytes ? `${Math.round(row.file_bytes / 1024)} KB` : "—"}
        </Td>
        <Td>
          {row.is_premium ? (
            <span className="text-meta rounded-pill bg-[#fdf1d8] px-2 py-0.5 text-[#8a6a1f]">
              {t.content.premiumOnly}
            </span>
          ) : (
            <span className="text-meta text-ink-faint">{t.content.freeOnly}</span>
          )}
        </Td>
        <Td>
          <StatusBadge status={row.status} locale={locale} />
        </Td>
        <Td className="whitespace-nowrap text-ink-faint">
          {fmtDate(row.updated_at, locale)}
        </Td>
      </tr>

      {open ? (
        <tr>
          <td colSpan={8} className="bg-cream-deep/60 px-4 py-5">
            {problems.length > 0 ? (
              <div className="mb-4">
                <Problems problems={problems} title={t.common.problems} />
              </div>
            ) : null}

            <form action={save} className="space-y-4">
              <input type="hidden" name="locale" value={locale} />
              <input type="hidden" name="id" value={row.id} />

              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                <Field label={t.content.primaryDomain} htmlFor={`dom-${row.id}`}>
                  <select
                    id={`dom-${row.id}`}
                    name="primary_domain"
                    defaultValue={row.primary_domain}
                    className={SELECT_CLASS}
                  >
                    {domains.map((d) => (
                      <option key={d.value} value={d.value}>
                        {d.label}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label={t.content.ageMin} htmlFor={`amin-${row.id}`}>
                  <Input
                    id={`amin-${row.id}`}
                    name="age_min_months"
                    type="number"
                    min={0}
                    max={72}
                    defaultValue={row.age_min_months}
                  />
                </Field>
                <Field label={t.content.ageMax} htmlFor={`amax-${row.id}`}>
                  <Input
                    id={`amax-${row.id}`}
                    name="age_max_months"
                    type="number"
                    min={1}
                    max={72}
                    defaultValue={row.age_max_months}
                  />
                </Field>
                <Field label={t.content.colPages} htmlFor={`pg-${row.id}`}>
                  <Input
                    id={`pg-${row.id}`}
                    name="page_count"
                    type="number"
                    min={1}
                    defaultValue={row.page_count}
                  />
                </Field>
                <Field
                  label={locale === "en" ? "Order" : "Urutan"}
                  htmlFor={`so-${row.id}`}
                >
                  <Input
                    id={`so-${row.id}`}
                    name="sort_order"
                    type="number"
                    defaultValue={row.sort_order}
                  />
                </Field>
              </div>

              <div className="grid gap-3 lg:grid-cols-2">
                <Field label={`${t.content.titleField} · ID`} htmlFor={`ti-${row.id}`}>
                  <Input
                    id={`ti-${row.id}`}
                    name="title_id"
                    defaultValue={tr.id?.title ?? ""}
                  />
                </Field>
                <Field label={`${t.content.titleField} · EN`} htmlFor={`te-${row.id}`}>
                  <Input
                    id={`te-${row.id}`}
                    name="title_en"
                    defaultValue={tr.en?.title ?? ""}
                  />
                </Field>
                <Field label={`${t.content.summary} · ID`} htmlFor={`di-${row.id}`}>
                  <Textarea
                    id={`di-${row.id}`}
                    name="description_id"
                    rows={2}
                    defaultValue={tr.id?.description ?? ""}
                  />
                </Field>
                <Field label={`${t.content.summary} · EN`} htmlFor={`de-${row.id}`}>
                  <Textarea
                    id={`de-${row.id}`}
                    name="description_en"
                    rows={2}
                    defaultValue={tr.en?.description ?? ""}
                  />
                </Field>
              </div>

              <label className="text-small flex items-center gap-2">
                <input
                  type="checkbox"
                  name="is_premium"
                  defaultChecked={row.is_premium}
                  className="size-4 accent-[var(--color-sage)]"
                />
                {t.content.premium}
              </label>

              <div className="flex flex-wrap items-center gap-2 border-t border-line pt-4">
                <Button type="submit" disabled={pending}>
                  {pending ? t.common.saving : t.common.save}
                </Button>

                <Button type="button" tone="secondary" onClick={preview} disabled={pending}>
                  {locale === "en" ? "Open the PDF" : "Buka PDF"}
                </Button>

                {canPublish ? (
                  row.status === "published" ? (
                    <Button
                      type="button"
                      tone="quiet"
                      onClick={() => publish("draft")}
                      disabled={pending}
                    >
                      {t.common.unpublish}
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      tone="secondary"
                      onClick={() => publish("published")}
                      disabled={pending}
                    >
                      {t.common.publish}
                    </Button>
                  )
                ) : null}
              </div>
            </form>
          </td>
        </tr>
      ) : null}
    </Fragment>
  );
}

export function WorksheetManager({
  locale,
  rows,
  domains,
  canPublish,
}: {
  locale: Locale;
  rows: Joined[];
  domains: Option[];
  canPublish: boolean;
}) {
  const t = adminCopy(locale);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  const drafts = rows.filter((r) => r.status !== "published").length;
  const noFile = rows.filter((r) => !r.file_path).length;

  return (
    <div className="space-y-4">
      {message ? (
        <Notice tone={message.ok ? "neutral" : "care"}>{message.text}</Notice>
      ) : null}

      {noFile > 0 ? (
        <Notice tone="care">
          {locale === "en"
            ? `${noFile} row(s) have no file and can never be published.`
            : `${noFile} baris tidak punya berkas dan tidak akan pernah bisa ditayangkan.`}
        </Notice>
      ) : null}

      <TableFrame
        head={
          <tr>
            <Th className="w-[6.5rem]">ID</Th>
            <Th>{t.content.colTitle}</Th>
            <Th>{t.content.colDomain}</Th>
            <Th>{t.content.colAge}</Th>
            <Th numeric>{t.content.colFile}</Th>
            <Th>{t.content.filterPremium}</Th>
            <Th>{t.content.colStatus}</Th>
            <Th>{t.content.colUpdated}</Th>
          </tr>
        }
        footer={
          <span className={cn(drafts > 0 && "text-ink-muted")}>
            {fmtNumber(rows.length)} {t.common.rows}
            {drafts > 0 ? ` · ${fmtNumber(drafts)} ${t.status.draft.toLowerCase()}` : ""}
          </span>
        }
      >
        {rows.map((row) => (
          <Row
            key={row.id}
            locale={locale}
            row={row}
            domains={domains}
            canPublish={canPublish}
            onMessage={setMessage}
          />
        ))}
      </TableFrame>
    </div>
  );
}
