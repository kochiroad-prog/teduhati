"use client";

import { useState, useTransition } from "react";
import { Button, Card, Field, Input, Notice } from "@/components/ui";
import { Td, Th, TableFrame } from "@/components/admin/parts";
import type { Locale } from "@/i18n/config";
import { adminCopy } from "@/lib/admin/copy";
import { saveAudioTrack, uploadAudioFile } from "@/lib/admin-actions";
import { AUDIO_KINDS, MUSIC_MODES } from "@/lib/admin/options";
import { publicFileUrl } from "@/lib/storage";
import type { AudioTrackRow } from "@/types/db";
import { cn } from "@/lib/utils";

/**
 * Audio tracks.
 *
 * Twenty-three rows exist in the taxonomy; none has a file yet, which is why the
 * music player marks a track unavailable when its URL 404s rather than showing a
 * play button that does nothing. This screen is how a file gets there: pick the
 * MP3, upload it, and `file_path` is set to the track's id so a later upload
 * replaces it instead of leaving an orphan nobody can identify.
 */

const SELECT_CLASS =
  "w-full rounded-[12px] border border-line bg-white px-3 py-2 text-[0.9375rem] text-ink focus:border-sage focus:outline-none";

function TrackRow({
  locale,
  track,
  onMessage,
}: {
  locale: Locale;
  track: AudioTrackRow;
  onMessage: (m: { ok: boolean; text: string }) => void;
}) {
  const t = adminCopy(locale);
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const url = track.file_path ? publicFileUrl("audio", track.file_path) : null;

  function save(data: FormData) {
    start(async () => {
      const r = await saveAudioTrack(data);
      onMessage({ ok: r.ok, text: r.ok ? t.common.saved : r.message });
    });
  }

  function upload(data: FormData) {
    start(async () => {
      const r = await uploadAudioFile(data);
      onMessage({ ok: r.ok, text: r.ok ? t.common.saved : r.message });
    });
  }

  return (
    <>
      <tr className="transition-colors hover:bg-black/[0.015]">
        <Td className="font-mono text-[0.8125rem] text-ink-faint">{track.id}</Td>
        <Td>
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="text-left font-medium hover:text-sage-dark hover:underline"
            aria-expanded={open}
          >
            {track.title}
          </button>
        </Td>
        <Td className="text-ink-muted">{track.kind}</Td>
        <Td className="text-ink-muted">{track.mode ?? t.common.none}</Td>
        <Td>
          {url ? (
            // The native player is the honest control here: it works, it shows
            // progress, and it needs no code of ours.
            <audio controls preload="none" src={url} className="h-8 max-w-[220px]" />
          ) : (
            <span className="text-meta rounded-pill bg-terracotta-soft px-2 py-0.5 text-[#8f4f38]">
              {t.content.audioMissing}
            </span>
          )}
        </Td>
        <Td>
          {track.is_premium ? (
            <span className="text-meta rounded-pill bg-[#fdf1d8] px-2 py-0.5 text-[#8a6a1f]">
              {t.content.premiumOnly}
            </span>
          ) : null}
        </Td>
      </tr>

      {open ? (
        <tr>
          <td colSpan={6} className="bg-cream-deep/60 px-4 py-5">
            <div className="grid gap-5 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
              <form action={save} className="space-y-3">
                <input type="hidden" name="locale" value={locale} />
                <input type="hidden" name="id" value={track.id} />

                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label={t.content.titleField} htmlFor={`title-${track.id}`}>
                    <Input
                      id={`title-${track.id}`}
                      name="title"
                      defaultValue={track.title}
                    />
                  </Field>
                  <Field label={t.content.audioKind} htmlFor={`kind-${track.id}`}>
                    <select
                      id={`kind-${track.id}`}
                      name="kind"
                      defaultValue={track.kind}
                      className={SELECT_CLASS}
                    >
                      {AUDIO_KINDS.map((k) => (
                        <option key={k.value} value={k.value}>
                          {k.label}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field label={t.content.musicMode} htmlFor={`mode-${track.id}`}>
                    <select
                      id={`mode-${track.id}`}
                      name="mode"
                      defaultValue={track.mode ?? ""}
                      className={SELECT_CLASS}
                    >
                      <option value="">{t.common.none}</option>
                      {MUSIC_MODES.map((m) => (
                        <option key={m.value} value={m.value}>
                          {m.label}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field
                    label={locale === "en" ? "Length (seconds)" : "Durasi (detik)"}
                    htmlFor={`dur-${track.id}`}
                  >
                    <Input
                      id={`dur-${track.id}`}
                      name="duration_seconds"
                      type="number"
                      min={1}
                      defaultValue={track.duration_seconds ?? ""}
                    />
                  </Field>
                </div>

                <div className="flex flex-wrap gap-5">
                  <label className="text-small flex items-center gap-2">
                    <input
                      type="checkbox"
                      name="is_loop"
                      defaultChecked={track.is_loop}
                      className="size-4 accent-[var(--color-sage)]"
                    />
                    {locale === "en" ? "Loops" : "Diulang"}
                  </label>
                  <label className="text-small flex items-center gap-2">
                    <input
                      type="checkbox"
                      name="is_premium"
                      defaultChecked={track.is_premium}
                      className="size-4 accent-[var(--color-sage)]"
                    />
                    {t.content.premium}
                  </label>
                </div>

                <Field
                  label={locale === "en" ? "Licence note" : "Catatan lisensi"}
                  htmlFor={`lic-${track.id}`}
                >
                  <Input
                    id={`lic-${track.id}`}
                    name="license_note"
                    defaultValue={track.license_note ?? ""}
                  />
                </Field>

                <input type="hidden" name="file_path" value={track.file_path ?? ""} />
                <input type="hidden" name="sort_order" value={track.sort_order} />

                <Button type="submit" disabled={pending}>
                  {pending ? t.common.saving : t.common.save}
                </Button>
              </form>

              <form action={upload} className="space-y-3">
                <input type="hidden" name="locale" value={locale} />
                <input type="hidden" name="id" value={track.id} />
                <Field
                  label={t.content.audioUpload}
                  help={
                    locale === "en"
                      ? "MP3 or OGG, under 15MB. Re-uploading replaces the current file."
                      : "MP3 atau OGG, di bawah 15MB. Unggah ulang akan menggantikan berkas yang ada."
                  }
                  htmlFor={`file-${track.id}`}
                >
                  <input
                    id={`file-${track.id}`}
                    name="file"
                    type="file"
                    accept="audio/mpeg,audio/ogg,.mp3,.ogg"
                    className="text-small w-full rounded-[12px] border border-line bg-white p-2.5 file:mr-3 file:rounded-pill file:border-0 file:bg-sage-soft file:px-3 file:py-1.5 file:text-sage-dark"
                  />
                </Field>
                <Button type="submit" tone="secondary" disabled={pending}>
                  {pending ? t.common.saving : t.content.audioUpload}
                </Button>
                {track.file_path ? (
                  <p className="text-meta break-all text-ink-faint">{track.file_path}</p>
                ) : null}
              </form>
            </div>
          </td>
        </tr>
      ) : null}
    </>
  );
}

export function AudioManager({
  locale,
  tracks,
}: {
  locale: Locale;
  tracks: AudioTrackRow[];
}) {
  const t = adminCopy(locale);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  const missing = tracks.filter((tr) => !tr.file_path).length;

  return (
    <div className="space-y-4">
      {message ? (
        <Notice tone={message.ok ? "neutral" : "care"}>{message.text}</Notice>
      ) : null}

      {missing > 0 ? (
        <Card className={cn("border-[#e0bdb0] bg-terracotta-soft")}>
          <p className="text-small text-[#8f4f38]">{t.overview.todoAudio(missing)}</p>
        </Card>
      ) : null}

      <TableFrame
        head={
          <tr>
            <Th className="w-[7rem]">ID</Th>
            <Th>{t.content.colTitle}</Th>
            <Th>{t.content.audioKind}</Th>
            <Th>{t.content.musicMode}</Th>
            <Th>{t.content.colFile}</Th>
            <Th>{t.content.filterPremium}</Th>
          </tr>
        }
        footer={`${tracks.length} ${t.common.rows}`}
      >
        {tracks.map((track) => (
          <TrackRow
            key={track.id}
            locale={locale}
            track={track}
            onMessage={setMessage}
          />
        ))}
      </TableFrame>
    </div>
  );
}
