import { notFound, redirect } from "next/navigation";
import { AppShell, PageHeader } from "@/components/AppShell";
import { Card, LeafCard, Pill } from "@/components/ui";
import { href, isLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { formatRupiah, isPremium } from "@/lib/entitlements";
import { getSession } from "@/lib/queries";
import { PlanPicker } from "@/components/PlanPicker";
import { checkoutAvailable, getSettings } from "@/lib/settings";

export default async function PlansPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: raw } = await params;
  if (!isLocale(raw)) notFound();
  const locale = raw;

  const dict = getDictionary(locale);
  const [session, settings] = await Promise.all([getSession(), getSettings()]);
  if (!session) redirect(href(locale, "signIn"));

  const onPaid = isPremium(session.plan);

  return (
    <AppShell
      locale={locale}
      header={<PageHeader locale={locale} title={dict.plans.title} />}
    >
      <div className="space-y-4 pt-1">
        <LeafCard>
          <div className="flex items-baseline justify-between gap-3">
            <h2 className="text-title">{dict.plans.premium}</h2>
            <p className="text-section">
              {formatRupiah(settings.price.premium)}
              <span className="text-small font-normal text-ink-muted">
                {dict.plans.perMonth}
              </span>
            </p>
          </div>

          <ul className="mt-4 space-y-2">
            {dict.plans.premiumList.map((item) => (
              <li key={item} className="text-small flex gap-2">
                <span aria-hidden="true" className="text-sage-dark">
                  &#10003;
                </span>
                {item}
              </li>
            ))}
          </ul>

          <p className="text-small mt-4 text-ink-muted">
            {dict.plans.annual}: {formatRupiah(settings.price.annual)}
            {dict.plans.perYear}
          </p>

          {onPaid ? (
            <p className="text-meta mt-4 text-sage-dark">{dict.plans.currentPlan}</p>
          ) : (
            <PlanPicker
              locale={locale}
              prices={settings.price}
              canPay={checkoutAvailable(settings)}
            />
          )}
        </LeafCard>

        <Card>
          <div className="flex items-baseline justify-between gap-3">
            <h2 className="text-section">{dict.plans.free}</h2>
            {!onPaid ? <Pill>{dict.plans.currentPlan}</Pill> : null}
          </div>
          <ul className="mt-3 space-y-1.5">
            {dict.plans.freeList.map((item) => (
              <li key={item} className="text-small text-ink-muted">
                {item}
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </AppShell>
  );
}
