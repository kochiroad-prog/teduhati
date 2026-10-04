import { notFound } from "next/navigation";
import { PageHead, fmtDateTime } from "@/components/admin/parts";
import { SettingsForm } from "@/components/admin/SettingsForm";
import { isLocale } from "@/i18n/config";
import { adminCopy } from "@/lib/admin/copy";
import { getAdminContext } from "@/lib/admin/guard";
import { getSettings } from "@/lib/settings";
import { createClient } from "@/lib/supabase/server";
import type { AppSettingRow } from "@/types/db";

/**
 * Settings.
 *
 * `getSettings()` reads the same function the rest of the app reads, so what an
 * admin sees here is exactly what a parent's payment screen will use. The row
 * timestamps come from the table itself, which is also what the audit trail
 * records against.
 */

export const dynamic = "force-dynamic";

export default async function SettingsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: raw } = await params;
  if (!isLocale(raw)) notFound();
  const locale = raw;
  const t = adminCopy(locale);

  const [ctx, settings] = await Promise.all([getAdminContext(), getSettings()]);
  const supabase = await createClient();
  const { data } = await supabase.from("app_settings").select("key, updated_at");

  const updatedAt: Record<string, string | null> = {};
  for (const row of (data ?? []) as Pick<AppSettingRow, "key" | "updated_at">[]) {
    updatedAt[row.key] = `${t.common.updated} ${fmtDateTime(row.updated_at, locale)}`;
  }

  return (
    <div>
      <PageHead title={t.settings.title} lead={t.settings.lead} />
      <SettingsForm
        locale={locale}
        settings={settings}
        canEdit={ctx.isAdmin}
        updatedAt={updatedAt}
      />
    </div>
  );
}
