import { notFound, redirect } from "next/navigation";
import { AppShell, PageHeader } from "@/components/AppShell";
import { AskForm } from "@/components/AskForm";
import { Card, Notice } from "@/components/ui";
import { createClient } from "@/lib/supabase/server";
import { href, isLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { entitlements } from "@/lib/entitlements";
import { activeChild, getSession, getUsageThisMonth } from "@/lib/queries";

export default async function AskPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ anak?: string }>;
}) {
  const { locale: raw } = await params;
  if (!isLocale(raw)) notFound();
  const locale = raw;
  const { anak } = await searchParams;

  const dict = getDictionary(locale);
  const session = await getSession();
  if (!session) redirect(href(locale, "signIn"));

  const child = activeChild(session, anak);
  if (!child) redirect(href(locale, "child"));

  const [usage, supabase] = await Promise.all([getUsageThisMonth(), createClient()]);
  const limit = entitlements(session.plan).aiQuestionsPerMonth;
  const remaining = limit === null ? null : Math.max(0, limit - usage.ai_questions);

  const { data: history } = await supabase
    .from("ai_conversations")
    .select("id, question, answer, created_at")
    .eq("child_id", child.id)
    .order("created_at", { ascending: false })
    .limit(5);

  return (
    <AppShell
      locale={locale}
      header={<PageHeader locale={locale} title={dict.ask.title} />}
    >
      <p className="text-small pb-5 text-ink-muted">{dict.ask.lead}</p>

      <AskForm
        locale={locale}
        childId={child.id}
        remaining={remaining}
        limitMessage={dict.ask.limitReached}
      />

      <div className="mt-5">
        <Notice>{dict.ask.disclaimer}</Notice>
      </div>

      {history && history.length > 0 ? (
        <section className="mt-8">
          <h2 className="text-section mb-3">{dict.ask.history}</h2>
          <ul className="space-y-2.5">
            {history.map((row) => (
              <li key={row.id}>
                <Card>
                  <p className="text-meta text-ink-faint">{row.question}</p>
                  <p className="text-small mt-2 whitespace-pre-wrap">{row.answer}</p>
                </Card>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </AppShell>
  );
}
