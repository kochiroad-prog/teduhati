import { notFound, redirect } from "next/navigation";
import { AppShell, PageHeader } from "@/components/AppShell";
import { MusicPlayer } from "@/components/MusicPlayer";
import { href, isLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { timeOfDay } from "@/lib/age";
import { getMusic, getSession } from "@/lib/queries";
import { getSettings } from "@/lib/settings";
import { audioBucketUrl } from "@/lib/storage";
import { Notice } from "@/components/ui";

export default async function MusicPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: raw } = await params;
  if (!isLocale(raw)) notFound();
  const locale = raw;

  const dict = getDictionary(locale);
  const session = await getSession();
  if (!session) redirect(href(locale, "signIn"));

  const [tracks, settings] = await Promise.all([getMusic(), getSettings()]);
  const { musicMode } = timeOfDay();

  return (
    <AppShell
      locale={locale}
      header={<PageHeader locale={locale} title={dict.music.title} />}
    >
      <p className="text-small pb-5 text-ink-muted">{dict.music.lead}</p>

      {settings.features.music ? (
        <MusicPlayer
          locale={locale}
          tracks={tracks}
          storageBase={audioBucketUrl()}
          suggestedMode={musicMode}
        />
      ) : (
        // Switched off in the dashboard, usually because no audio file has been
        // uploaded yet. Saying so is better than a player that plays nothing.
        <Notice title={locale === "en" ? "Not ready yet" : "Belum siap"}>
          {locale === "en"
            ? "The music library isn't switched on yet. It will appear here once the tracks are in place."
            : "Perpustakaan musik belum diaktifkan. Akan muncul di sini setelah treknya siap."}
        </Notice>
      )}
    </AppShell>
  );
}
