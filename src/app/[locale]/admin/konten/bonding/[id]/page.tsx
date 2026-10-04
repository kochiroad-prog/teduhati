import Link from "next/link";
import { notFound } from "next/navigation";
import { BondingEditor } from "@/components/admin/BondingEditor";
import { PageHead } from "@/components/admin/parts";
import { StatusControl } from "@/components/admin/StatusControl";
import { isLocale } from "@/i18n/config";
import { adminCopy } from "@/lib/admin/copy";
import { getAdminContext } from "@/lib/admin/guard";
import { adminHref } from "@/lib/admin/routes";
import { createClient } from "@/lib/supabase/server";
import type { BondingMomentRow, BondingMomentTranslationRow } from "@/types/db";

export const dynamic = "force-dynamic";

export default async function BondingEditorPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale: raw, id } = await params;
  if (!isLocale(raw)) notFound();
  const locale = raw;
  const t = adminCopy(locale);
  const isNew = id === "baru";

  const ctx = await getAdminContext();
  const supabase = await createClient();

  let moment: BondingMomentRow | null = null;
  let translations: {
    id: BondingMomentTranslationRow | null;
    en: BondingMomentTranslationRow | null;
  } = { id: null, en: null };
  let problems: string[] = [];

  if (!isNew) {
    const [{ data: row }, { data: trRows }, { data: problemRows }] = await Promise.all([
      supabase.from("bonding_moments").select("*").eq("id", id).maybeSingle(),
      supabase
        .from("bonding_moment_translations")
        .select("*")
        .eq("bonding_moment_id", id),
      supabase.rpc("validate_bonding", { p_id: id }),
    ]);
    if (!row) notFound();
    moment = row as BondingMomentRow;
    const list = (trRows ?? []) as BondingMomentTranslationRow[];
    translations = {
      id: list.find((r) => r.locale === "id") ?? null,
      en: list.find((r) => r.locale === "en") ?? null,
    };
    problems = (problemRows ?? []) as string[];
  }

  const title = isNew
    ? t.content.newBonding
    : translations[locale]?.title ?? translations.id?.title ?? id;

  return (
    <div>
      <PageHead
        title={title}
        action={
          <Link
            href={adminHref(locale, "bonding")}
            className="text-meta text-ink-muted hover:text-ink"
          >
            &larr; {t.content.bondingTitle}
          </Link>
        }
      />

      <div className="space-y-6">
        {moment ? (
          <StatusControl
            locale={locale}
            table="bonding_moments"
            id={moment.id}
            status={moment.status}
            canPublish={ctx.isAdmin}
          />
        ) : null}

        <BondingEditor
          locale={locale}
          moment={moment}
          translations={translations}
          problems={problems}
        />
      </div>
    </div>
  );
}
