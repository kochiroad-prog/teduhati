import { notFound, redirect } from "next/navigation";
import { AppShell, PageHeader } from "@/components/AppShell";
import { PaymentPanel } from "@/components/PaymentPanel";
import { Notice } from "@/components/ui";
import { createClient } from "@/lib/supabase/server";
import { href, isLocale } from "@/i18n/config";
import { getSession } from "@/lib/queries";
import { checkoutAvailable, getSettings } from "@/lib/settings";

export default async function PayPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale: raw, id } = await params;
  if (!isLocale(raw)) notFound();
  const locale = raw;

  const session = await getSession();
  if (!session) redirect(href(locale, "signIn"));

  const settings = await getSettings();
  const supabase = await createClient();
  const { data: order } = await supabase
    .from("orders")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (!order) notFound();

  return (
    <AppShell
      locale={locale}
      header={
        <PageHeader
          locale={locale}
          title={locale === "en" ? "Payment" : "Pembayaran"}
          backTo="plans"
        />
      }
    >
      {!checkoutAvailable(settings) ? (
        <div className="mb-5">
          <Notice tone="care" title={locale === "en" ? "Not ready yet" : "Belum siap"}>
            {locale === "en"
              ? "No receiving account is set yet, so this order cannot be paid. The team fills it in under Settings in the dashboard."
              : "Rekening penerima belum diisi, jadi pesanan ini belum bisa dibayar. Tim mengisinya di menu Pengaturan pada dashboard."}
          </Notice>
        </div>
      ) : null}

      <PaymentPanel
        locale={locale}
        order={order}
        bank={{
          bank: settings.bank.name,
          accountNumber: settings.bank.accountNumber,
          accountName: settings.bank.accountHolder,
        }}
      />
    </AppShell>
  );
}
