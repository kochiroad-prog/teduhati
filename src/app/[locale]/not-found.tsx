import { ButtonLink } from "@/components/ui";
import { Tumi } from "@/components/Tumi";
import { getDictionary } from "@/i18n/dictionaries";

export default function NotFound() {
  // A not-found page renders outside the locale params, so it speaks the
  // default language. Keeping it short avoids a half-translated screen.
  const dict = getDictionary("id");

  return (
    <div className="flex min-h-dvh items-center justify-center px-6 text-center">
      <div>
        <Tumi state="thinking" size={96} className="mx-auto" />
        <h1 className="text-title mt-5">{dict.common.notFound}</h1>
        <p className="text-small mx-auto mt-2 max-w-[32ch] text-ink-muted">
          {dict.common.notFoundLead}
        </p>
        <ButtonLink href="/id" className="mt-6">
          {dict.common.backHome}
        </ButtonLink>
      </div>
    </div>
  );
}
