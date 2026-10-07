import { notFound } from "next/navigation";
import { AudioManager } from "@/components/admin/AudioManager";
import { PageHead, QueryError } from "@/components/admin/parts";
import { EmptyState } from "@/components/ui";
import { isLocale } from "@/i18n/config";
import { adminCopy } from "@/lib/admin/copy";
import { createClient } from "@/lib/supabase/server";
import type { AudioStatusRow, AudioTrackRow } from "@/types/db";

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
  // Two queries, because file_path alone cannot say whether a file exists: the
  // taxonomy seed wrote paths for tracks nobody had uploaded.
  const [{ data, error }, { data: statusRaw }] = await Promise.all([
    supabase.from("audio_tracks").select("*").order("kind").order("sort_order"),
    supabase.rpc("admin_audio_status"),
  ]);

  const tracks = (data ?? []) as AudioTrackRow[];
  const present = new Set(
    ((statusRaw ?? []) as AudioStatusRow[]).filter((r) => r.has_object).map((r) => r.id),
  );

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
        <AudioManager locale={locale} tracks={tracks} present={present} />
      )}
    </div>
  );
}
