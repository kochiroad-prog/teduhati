import { Tumi } from "@/components/Tumi";
import { getDictionary } from "@/i18n/dictionaries";
import type { Locale } from "@/i18n/config";

/** The shared frame for every signed-out screen. */
export function AuthScreen({
  locale,
  title,
  lead,
  children,
}: {
  locale: Locale;
  title: string;
  lead: string;
  children: React.ReactNode;
}) {
  const dict = getDictionary(locale);

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

        <h1 className="text-title">{title}</h1>
        <p className="text-small mt-1.5 text-ink-muted">{lead}</p>

        {children}
      </div>
    </div>
  );
}
