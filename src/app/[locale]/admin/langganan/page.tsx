import { notFound } from "next/navigation";
import { PageHead } from "@/components/admin/parts";
import { SubscriptionTable } from "@/components/admin/SubscriptionTable";
import { EmptyState } from "@/components/ui";
import { isLocale } from "@/i18n/config";
import { adminCopy } from "@/lib/admin/copy";
import { getAdminContext, requestNow } from "@/lib/admin/guard";
import { createClient } from "@/lib/supabase/server";
import type { ProfileRow, SubscriptionRow } from "@/types/db";

export const dynamic = "force-dynamic";

export default async function SubscriptionsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: raw } = await params;
  if (!isLocale(raw)) notFound();
  const locale = raw;
  const t = adminCopy(locale);

  const ctx = await getAdminContext();
  const supabase = await createClient();

  const [{ data: subsRaw }, { data: profileRaw }] = await Promise.all([
    supabase
      .from("subscriptions")
      .select("*")
      .order("status")
      .order("expires_at", { ascending: true }),
    supabase.from("profiles").select("id, display_name"),
  ]);

  const rows = (subsRaw ?? []) as SubscriptionRow[];
  const names: Record<string, string | null> = {};
  for (const p of (profileRaw ?? []) as Pick<ProfileRow, "id" | "display_name">[]) {
    names[p.id] = p.display_name;
  }

  return (
    <div>
      <PageHead title={t.subscriptions.title} lead={t.subscriptions.lead} />

      {rows.length === 0 ? (
        <EmptyState title={t.subscriptions.empty} lead={t.subscriptions.emptyLead} />
      ) : (
        <SubscriptionTable
          locale={locale}
          rows={rows}
          names={names}
          canManage={ctx.isAdmin}
          nowMs={requestNow()}
        />
      )}
    </div>
  );
}
