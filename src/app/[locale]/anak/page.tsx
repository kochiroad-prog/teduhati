import { notFound, redirect } from "next/navigation";
import { AppShell, PageHeader } from "@/components/AppShell";
import { ChildForm } from "@/components/ChildForm";
import { SignOutButton } from "@/components/SignOutButton";
import { Card } from "@/components/ui";
import { href, isLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { ageInMonths, formatAge, resolveAgeBand } from "@/lib/age";
import { entitlements } from "@/lib/entitlements";
import { getAgeBandLabel, getSession } from "@/lib/queries";

export default async function ChildPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ ubah?: string }>;
}) {
  const { locale: raw } = await params;
  if (!isLocale(raw)) notFound();
  const locale = raw;
  const { ubah } = await searchParams;

  const dict = getDictionary(locale);
  const session = await getSession();
  if (!session) redirect(href(locale, "signIn"));

  const editing = ubah ? session.children.find((c) => c.id === ubah) ?? null : null;
  const limit = entitlements(session.plan).children;
  const atLimit = !editing && session.children.length >= limit;

  return (
    <AppShell
      locale={locale}
      header={<PageHeader locale={locale} title={dict.child.title} />}
    >
      {session.children.length > 0 ? (
        <ul className="mb-6 space-y-2.5">
          {session.children.map((c) => {
            const months = ageInMonths(c.birth_date);
            return (
              <li key={c.id}>
                <Card className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-section truncate">{c.name}</p>
                    <p className="text-small text-ink-faint">
                      {formatAge(months, dict)}
                    </p>
                  </div>
                  <a
                    href={`${href(locale, "child")}?ubah=${c.id}`}
                    className="text-meta shrink-0 text-sage-dark hover:underline"
                  >
                    {dict.common.save === "Simpan" ? "Ubah" : "Edit"}
                  </a>
                </Card>
              </li>
            );
          })}
        </ul>
      ) : null}

      {atLimit ? (
        <Card>
          <p className="text-small text-ink-muted">{dict.child.limitFree}</p>
          <a
            href={href(locale, "plans")}
            className="text-meta mt-3 inline-block text-sage-dark hover:underline"
          >
            {dict.plans.title}
          </a>
        </Card>
      ) : (
        <ChildForm
          locale={locale}
          child={editing}
          bandHint={
            editing
              ? await getAgeBandLabel(
                  resolveAgeBand(ageInMonths(editing.birth_date)),
                  locale,
                )
              : null
          }
        />
      )}

      <div className="mt-10 border-t border-line pt-6">
        <SignOutButton locale={locale} />
      </div>
    </AppShell>
  );
}
