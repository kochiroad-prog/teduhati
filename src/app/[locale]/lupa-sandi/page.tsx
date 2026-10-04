import { notFound } from "next/navigation";
import { AuthScreen } from "@/components/AuthScreen";
import { ResetRequestForm } from "@/components/AuthForms";
import { isLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";

export default async function ForgotPasswordPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: raw } = await params;
  if (!isLocale(raw)) notFound();
  const dict = getDictionary(raw);

  return (
    <AuthScreen locale={raw} title={dict.auth.forgotTitle} lead={dict.auth.forgotLead}>
      <ResetRequestForm locale={raw} />
    </AuthScreen>
  );
}
