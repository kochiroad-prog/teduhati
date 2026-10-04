import { notFound } from "next/navigation";
import { AuthScreen } from "@/components/AuthScreen";
import { SignInForm } from "@/components/AuthForms";
import { Notice } from "@/components/ui";
import { isLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";

export default async function SignInPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ lanjut?: string; tautan?: string }>;
}) {
  const { locale: raw } = await params;
  if (!isLocale(raw)) notFound();
  const { lanjut, tautan } = await searchParams;
  const dict = getDictionary(raw);

  return (
    <AuthScreen locale={raw} title={dict.auth.signInTitle} lead={dict.auth.signInLead}>
      {tautan === "tidak-valid" ? (
        <div className="mt-5">
          <Notice tone="care">{dict.auth.linkInvalid}</Notice>
        </div>
      ) : null}
      <SignInForm locale={raw} next={lanjut} />
    </AuthScreen>
  );
}
