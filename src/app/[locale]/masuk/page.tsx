import { notFound } from "next/navigation";
import { SignInForm } from "@/components/SignInForm";
import { Tumi } from "@/components/Tumi";
import { isLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";

export default async function SignInPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ lanjut?: string }>;
}) {
  const { locale: raw } = await params;
  if (!isLocale(raw)) notFound();
  const { lanjut } = await searchParams;
  const dict = getDictionary(raw);

  return (
    <div className="flex min-h-dvh items-center justify-center px-5 py-10">
      <div className="w-full max-w-[400px]">
        <div className="mb-8 text-center">
          <Tumi state="happy" size={104} float className="mx-auto" />
          <p className="mt-5 text-[1.0625rem] font-extrabold tracking-[-0.03em] text-sage-dark">
            {dict.brand.name}
          </p>
          <p className="text-small mt-1 text-ink-muted">{dict.brand.tagline}</p>
        </div>

        <h1 className="text-title">{dict.auth.signInTitle}</h1>
        <p className="text-small mt-1.5 text-ink-muted">{dict.auth.signInLead}</p>

        <SignInForm locale={raw} next={lanjut} />
      </div>
    </div>
  );
}
