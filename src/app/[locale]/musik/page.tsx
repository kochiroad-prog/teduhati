import { notFound, redirect } from "next/navigation";
import { AppShell, PageHeader } from "@/components/AppShell";
import { MusicPlayer } from "@/components/MusicPlayer";
import { href, isLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { timeOfDay } from "@/lib/age";
import { getMusic, getSession } from "@/lib/queries";
import { audioBucketUrl } from "@/lib/storage";

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

  const tracks = await getMusic();
  const { musicMode } = timeOfDay();

  return (
    <AppShell
      locale={locale}
      header={<PageHeader locale={locale} title={dict.music.title} />}
    >
      <p className="text-small pb-5 text-ink-muted">{dict.music.lead}</p>

      <MusicPlayer
        locale={locale}
        tracks={tracks}
        storageBase={audioBucketUrl()}
        suggestedMode={musicMode}
      />
    </AppShell>
  );
}
