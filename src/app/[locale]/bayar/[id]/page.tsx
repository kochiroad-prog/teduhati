import { notFound, redirect } from "next/navigation";
import { AppShell, PageHeader } from "@/components/AppShell";
import { PaymentPanel } from "@/components/PaymentPanel";
import { Notice } from "@/components/ui";
import { createClient } from "@/lib/supabase/server";
import { href, isLocale } from "@/i18n/config";
import { BANK_ACCOUNT, bankAccountConfigured } from "@/lib/payments";
import { getSession } from "@/lib/queries";

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
      {!bankAccountConfigured() ? (
        <div className="mb-5">
          <Notice tone="care" title={locale === "en" ? "Not ready yet" : "Belum siap"}>
            {locale === "en"
              ? "No bank account is configured, so this order cannot be paid. Set NEXT_PUBLIC_BANK_NAME, NEXT_PUBLIC_BANK_ACCOUNT and NEXT_PUBLIC_BANK_HOLDER."
              : "Rekening tujuan belum diisi, jadi pesanan ini belum bisa dibayar. Isi NEXT_PUBLIC_BANK_NAME, NEXT_PUBLIC_BANK_ACCOUNT, dan NEXT_PUBLIC_BANK_HOLDER."}
          </Notice>
        </div>
      ) : null}

      <PaymentPanel locale={locale} order={order} bank={BANK_ACCOUNT} />
    </AppShell>
  );
}
