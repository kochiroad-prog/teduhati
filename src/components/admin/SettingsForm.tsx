"use client";

import { useState, useTransition } from "react";
import { Button, Card, Field, Input, Notice } from "@/components/ui";
import { Problems } from "@/components/admin/parts";
import type { Locale } from "@/i18n/config";
import { adminCopy } from "@/lib/admin/copy";
import { saveSettings } from "@/lib/admin-actions";
import type { AppSettings } from "@/lib/settings";
import { cn } from "@/lib/utils";

/**
 * Settings.
 *
 * These were environment variables and constants in the code until now, which
 * meant changing a price was a deploy. They are rows in `app_settings`, written
 * only by `set_setting`, which range-checks each one in Postgres — so a typo in
 * a price field comes back as a message rather than a broken paywall.
 *
 * A checkbox that is off sends nothing at all, so each switch carries a hidden
 * companion field. Without it, saving the form with every switch off would look
 * identical to saving a form that had no switches on it.
 */

export function SettingsForm({
  locale,
  settings,
  canEdit,
  updatedAt,
}: {
  locale: Locale;
  settings: AppSettings;
  canEdit: boolean;
  updatedAt: Record<string, string | null>;
}) {
  const t = adminCopy(locale);
  const [result, setResult] = useState<{ ok: boolean; message: string; problems?: string[] } | null>(
    null,
  );
  const [pending, start] = useTransition();

  const bankReady = Boolean(
    settings.bank.name && settings.bank.accountNumber && settings.bank.accountHolder,
  );

  function submit(data: FormData) {
    start(async () => {
      const r = await saveSettings(data);
      setResult(
        r.ok
          ? { ok: true, message: r.message ?? t.common.saved }
          : { ok: false, message: r.message, problems: r.problems },
      );
    });
  }

  const switches: [keyof AppSettings["features"], string, string][] = [
    ["checkout", t.nav.orders, "feature.checkout"],
    ["music", t.nav.audio, "feature.music"],
    ["ai", "Tanya TEDUHATI", "feature.ai"],
    ["worksheets", t.nav.worksheets, "feature.worksheets"],
  ];

  return (
    <form action={submit} className="space-y-6">
      <input type="hidden" name="locale" value={locale} />

      {result ? (
        <>
          <Notice tone={result.ok ? "neutral" : "care"}>{result.message}</Notice>
          <Problems problems={result.problems ?? []} title={t.common.problems} />
        </>
      ) : null}

      {/* ----------------------------------------------------------------- */}
      <Card className="space-y-5">
        <div>
          <h2 className="text-section">{t.settings.bankTitle}</h2>
          <p className="text-small mt-1 text-ink-muted">{t.settings.bankLead}</p>
        </div>

        {!bankReady ? <Notice tone="care">{t.overview.todoBank}</Notice> : null}

        <div className="grid gap-4 sm:grid-cols-3">
          <Field
            label={locale === "en" ? "Bank" : "Nama bank"}
            htmlFor="bank.name"
            help={updatedAt["bank.name"] ?? undefined}
          >
            <Input
              id="bank.name"
              name="bank.name"
              defaultValue={settings.bank.name}
              placeholder="BCA"
              disabled={!canEdit}
            />
          </Field>
          <Field
            label={locale === "en" ? "Account number" : "Nomor rekening"}
            htmlFor="bank.account_number"
          >
            <Input
              id="bank.account_number"
              name="bank.account_number"
              defaultValue={settings.bank.accountNumber}
              inputMode="numeric"
              disabled={!canEdit}
            />
          </Field>
          <Field
            label={locale === "en" ? "Account holder" : "Nama pemilik"}
            htmlFor="bank.account_holder"
          >
            <Input
              id="bank.account_holder"
              name="bank.account_holder"
              defaultValue={settings.bank.accountHolder}
              disabled={!canEdit}
            />
          </Field>
        </div>
      </Card>

      {/* ----------------------------------------------------------------- */}
      <Card className="space-y-5">
        <div>
          <h2 className="text-section">{t.settings.priceTitle}</h2>
          <p className="text-small mt-1 text-ink-muted">{t.settings.priceLead}</p>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <Field
            label={locale === "en" ? "Monthly" : "Bulanan"}
            htmlFor="price.premium"
            help={`Rp${settings.price.premium.toLocaleString("id-ID")}`}
          >
            <Input
              id="price.premium"
              name="price.premium"
              type="number"
              min={1000}
              step={1000}
              defaultValue={settings.price.premium}
              disabled={!canEdit}
            />
          </Field>
          <Field
            label={locale === "en" ? "Yearly" : "Tahunan"}
            htmlFor="price.annual"
            help={`Rp${settings.price.annual.toLocaleString("id-ID")}`}
          >
            <Input
              id="price.annual"
              name="price.annual"
              type="number"
              min={1000}
              step={1000}
              defaultValue={settings.price.annual}
              disabled={!canEdit}
            />
          </Field>
          <Field
            label={locale === "en" ? "Order window (hours)" : "Masa berlaku pesanan (jam)"}
            htmlFor="order.window_hours"
          >
            <Input
              id="order.window_hours"
              name="order.window_hours"
              type="number"
              min={1}
              max={168}
              defaultValue={settings.orderWindowHours}
              disabled={!canEdit}
            />
          </Field>
        </div>
      </Card>

      {/* ----------------------------------------------------------------- */}
      <Card className="space-y-5">
        <div>
          <h2 className="text-section">{t.settings.freeTitle}</h2>
          <p className="text-small mt-1 text-ink-muted">{t.settings.freeLead}</p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Field label={t.users.colChildren} htmlFor="free.children">
            <Input
              id="free.children"
              name="free.children"
              type="number"
              min={0}
              max={10}
              defaultValue={settings.free.children}
              disabled={!canEdit}
            />
          </Field>
          <Field
            label={locale === "en" ? "Activities per day" : "Aktivitas per hari"}
            htmlFor="free.activities_per_day"
          >
            <Input
              id="free.activities_per_day"
              name="free.activities_per_day"
              type="number"
              min={0}
              max={50}
              defaultValue={settings.free.activitiesPerDay}
              disabled={!canEdit}
            />
          </Field>
          <Field
            label={locale === "en" ? "Stories per month" : "Cerita per bulan"}
            htmlFor="free.stories_per_month"
          >
            <Input
              id="free.stories_per_month"
              name="free.stories_per_month"
              type="number"
              min={0}
              max={200}
              defaultValue={settings.free.storiesPerMonth}
              disabled={!canEdit}
            />
          </Field>
          <Field
            label={locale === "en" ? "AI questions per month" : "Pertanyaan AI per bulan"}
            htmlFor="free.ai_questions_per_month"
          >
            <Input
              id="free.ai_questions_per_month"
              name="free.ai_questions_per_month"
              type="number"
              min={0}
              max={500}
              defaultValue={settings.free.aiQuestionsPerMonth}
              disabled={!canEdit}
            />
          </Field>
        </div>
      </Card>

      {/* ----------------------------------------------------------------- */}
      <Card className="space-y-5">
        <div>
          <h2 className="text-section">{t.settings.featureTitle}</h2>
          <p className="text-small mt-1 text-ink-muted">{t.settings.featureLead}</p>
        </div>

        <div className="space-y-3">
          {switches.map(([key, label, settingKey]) => (
            <label
              key={settingKey}
              className={cn(
                "flex items-center justify-between gap-4 rounded-[14px] border border-line bg-white px-4 py-3",
                !canEdit && "opacity-60",
              )}
            >
              <span className="text-small">{label}</span>
              <span className="flex items-center gap-2">
                <input type="hidden" name={`present.${settingKey}`} value="1" />
                <input
                  type="checkbox"
                  name={settingKey}
                  defaultChecked={settings.features[key]}
                  disabled={!canEdit}
                  className="size-4 accent-[var(--color-sage)]"
                />
                <span className="text-meta text-ink-faint">
                  {settings.features[key] ? t.settings.on : t.settings.off}
                </span>
              </span>
            </label>
          ))}
        </div>
      </Card>

      {canEdit ? (
        <div className="sticky bottom-0 -mx-5 border-t border-line bg-cream/95 px-5 py-4 backdrop-blur">
          <Button type="submit" size="lg" disabled={pending}>
            {pending ? t.common.saving : t.common.save}
          </Button>
        </div>
      ) : (
        <Notice>{t.common.adminOnly}</Notice>
      )}
    </form>
  );
}
