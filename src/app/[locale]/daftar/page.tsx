import { notFound } from "next/navigation";
import { AuthScreen } from "@/components/AuthScreen";
import { SignUpForm } from "@/components/AuthForms";
import { isLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";

export default async function SignUpPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: raw } = await params;
  if (!isLocale(raw)) notFound();
  const dict = getDictionary(raw);

  return (
    <AuthScreen locale={raw} title={dict.auth.signUpTitle} lead={dict.auth.signUpLead}>
      <SignUpForm locale={raw} />
    </AuthScreen>
  );
}
