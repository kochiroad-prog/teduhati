import { notFound } from "next/navigation";
import { AudioManager } from "@/components/admin/AudioManager";
import { PageHead, QueryError } from "@/components/admin/parts";
import { EmptyState } from "@/components/ui";
import { isLocale } from "@/i18n/config";
import { adminCopy } from "@/lib/admin/copy";
import { createClient } from "@/lib/supabase/server";
import type { AudioTrackRow } from "@/types/db";

export const dynamic = "force-dynamic";

export default async function AudioPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: raw } = await params;
  if (!isLocale(raw)) notFound();
  const locale = raw;
  const t = adminCopy(locale);

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("audio_tracks")
    .select("*")
    .order("kind")
    .order("sort_order");

  const tracks = (data ?? []) as AudioTrackRow[];

  return (
    <div>
      <PageHead
        title={t.content.audioTitle}
        lead={
          locale === "en"
            ? "Files live in the audio bucket. A track with no file is marked unavailable in the player rather than offered as a dead button."
            : "Berkas disimpan di bucket audio. Trek tanpa berkas ditandai tidak tersedia di pemutar, bukan ditampilkan sebagai tombol mati."
        }
      />

      <QueryError error={error} locale={locale} />

      {tracks.length === 0 ? (
        <EmptyState
          title={locale === "en" ? "No audio tracks yet." : "Belum ada trek audio."}
          lead={
            locale === "en"
              ? "The taxonomy seed creates them; run npm run db:seed."
              : "Trek dibuat oleh seed taksonomi; jalankan npm run db:seed."
          }
        />
      ) : (
        <AudioManager locale={locale} tracks={tracks} />
      )}
    </div>
  );
}
