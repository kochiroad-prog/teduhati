import { notFound, redirect } from "next/navigation";
import { AppShell, PageHeader } from "@/components/AppShell";
import { Chip, Pill } from "@/components/ui";
import { href, isLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { timeOfDay } from "@/lib/age";
import { getMusic, getSession } from "@/lib/queries";
import type { MusicMode } from "@/types/db";

const MODES: MusicMode[] = ["morning", "play", "bonding", "bedtime"];

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

      <div className="space-y-7">
        {MODES.map((mode) => {
          const inMode = tracks.filter((t) => t.mode === mode);
          if (inMode.length === 0) return null;

          return (
            <section key={mode}>
              <div className="mb-3 flex items-baseline gap-2">
                <h2 className="text-section">{dict.music.modes[mode]}</h2>
                {mode === musicMode ? (
                  <Pill>{dict.home.musicLabel}</Pill>
                ) : null}
              </div>

              <ul className="space-y-2.5">
                {inMode.map((track) => (
                  <li key={track.id} className="surface p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-section truncate">{track.title}</p>
                        <p className="text-small mt-0.5 text-ink-faint">
                          {track.instruments
                            .map((i) => i.replace(/_/g, " "))
                            .join(" · ")}
                        </p>
                      </div>
                      {track.is_premium ? (
                        <span className="text-meta shrink-0 text-yellow">
                          {dict.common.premiumBadge}
                        </span>
                      ) : null}
                    </div>

                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      {track.bpm_min && track.bpm_max ? (
                        <Chip colorToken="dusty_blue">
                          {track.bpm_min}–{track.bpm_max} BPM
                        </Chip>
                      ) : null}
                      {/* The catalog exists before the audio does; say so plainly
                          rather than shipping a play button that does nothing. */}
                      {track.file_path ? (
                        <Pill>{dict.music.comingSoon}</Pill>
                      ) : null}
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          );
        })}
      </div>
    </AppShell>
  );
}
