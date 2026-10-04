"use client";

import { useEffect, useRef, useState } from "react";
import { Card, Chip, Pill } from "@/components/ui";
import { getDictionary } from "@/i18n/dictionaries";
import type { Locale } from "@/i18n/config";
import type { AudioTrackRow, MusicMode } from "@/types/db";
import { cn } from "@/lib/utils";

/**
 * The music player.
 *
 * One <audio> element is shared by the whole list, because two tracks playing at
 * once in a bedtime app is a bug, not a feature. A track whose file is missing
 * from storage reports that instead of offering a control that does nothing —
 * the catalogue exists before the recordings do.
 */

const MODES: MusicMode[] = ["morning", "play", "bonding", "bedtime"];

function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function MusicPlayer({
  locale,
  tracks,
  storageBase,
  suggestedMode,
}: {
  locale: Locale;
  tracks: AudioTrackRow[];
  /** Public base URL of the `audio` storage bucket, or null when unconfigured. */
  storageBase: string | null;
  suggestedMode: MusicMode;
}) {
  const dict = getDictionary(locale);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const [mode, setMode] = useState<MusicMode>(suggestedMode);
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [playing, setPlaying] = useState(false);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);
  const [loop, setLoop] = useState(true);
  // Tracks whose file 404s. Discovered on first play, not guessed up front.
  const [missing, setMissing] = useState<Set<string>>(new Set());

  const inMode = tracks.filter((t) => t.mode === mode);
  const current = tracks.find((t) => t.id === currentId) ?? null;

  function urlFor(track: AudioTrackRow): string | null {
    if (!storageBase || !track.file_path) return null;
    return `${storageBase.replace(/\/$/, "")}/${track.file_path}`;
  }

  useEffect(() => {
    const el = audioRef.current;
    if (el) el.loop = loop;
  }, [loop]);

  async function toggle(track: AudioTrackRow) {
    const el = audioRef.current;
    if (!el) return;

    if (currentId === track.id) {
      if (playing) {
        el.pause();
      } else {
        await el.play().catch(() => markMissing(track.id));
      }
      return;
    }

    const url = urlFor(track);
    if (!url) {
      markMissing(track.id);
      return;
    }

    el.src = url;
    el.currentTime = 0;
    setCurrentId(track.id);
    setPosition(0);
    setDuration(0);
    await el.play().catch(() => markMissing(track.id));
  }

  function markMissing(id: string) {
    setMissing((prev) => new Set(prev).add(id));
    setPlaying(false);
    setCurrentId((c) => (c === id ? null : c));
  }

  function seek(value: number) {
    const el = audioRef.current;
    if (!el || !Number.isFinite(duration) || duration <= 0) return;
    el.currentTime = (value / 100) * duration;
    setPosition(el.currentTime);
  }

  return (
    <div className="space-y-5">
      <audio
        ref={audioRef}
        preload="none"
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => setPlaying(false)}
        onTimeUpdate={(e) => setPosition(e.currentTarget.currentTime)}
        onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
        onError={() => currentId && markMissing(currentId)}
      />

      {/* mode switcher */}
      <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4">
        {MODES.map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setMode(m)}
            aria-pressed={m === mode}
            className={cn(
              "text-meta shrink-0 rounded-pill border px-4 py-2 transition-colors",
              m === mode
                ? "border-sage bg-sage text-white"
                : "border-line bg-white text-ink-muted hover:border-sage",
            )}
          >
            {dict.music.modes[m]}
            {m === suggestedMode && m !== mode ? " ·" : ""}
          </button>
        ))}
      </div>

      {/* now playing */}
      {current ? (
        <Card className="leaf-sm bg-sage-soft">
          <p className="text-meta text-sage-dark">{dict.music.modes[current.mode ?? mode]}</p>
          <p className="text-title mt-1">{current.title}</p>

          <input
            type="range"
            min={0}
            max={100}
            step={0.5}
            value={duration > 0 ? (position / duration) * 100 : 0}
            onChange={(e) => seek(Number(e.target.value))}
            aria-label={locale === "en" ? "Seek" : "Geser posisi"}
            className="mt-4 w-full accent-[var(--color-sage-dark)]"
          />
          <div className="text-meta flex justify-between text-ink-muted">
            <span>{formatTime(position)}</span>
            <span>{formatTime(duration)}</span>
          </div>

          <div className="mt-4 flex items-center gap-3">
            <button
              type="button"
              onClick={() => toggle(current)}
              className="flex h-12 w-12 items-center justify-center rounded-pill bg-sage text-white transition-colors hover:bg-sage-dark"
              aria-label={playing ? dict.music.pause : dict.music.play}
            >
              {playing ? (
                <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
                  <rect x="3" y="2" width="4.5" height="14" rx="1.4" fill="currentColor" />
                  <rect x="10.5" y="2" width="4.5" height="14" rx="1.4" fill="currentColor" />
                </svg>
              ) : (
                <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
                  <path d="M4 2.6 L15 9 L4 15.4 Z" fill="currentColor" />
                </svg>
              )}
            </button>

            <button
              type="button"
              onClick={() => setLoop((v) => !v)}
              aria-pressed={loop}
              className={cn(
                "text-meta rounded-pill border px-3.5 py-2 transition-colors",
                loop
                  ? "border-sage-dark bg-white text-sage-dark"
                  : "border-line bg-white text-ink-faint",
              )}
            >
              {locale === "en" ? "Loop" : "Ulang terus"}
            </button>
          </div>
        </Card>
      ) : null}

      {/* track list */}
      <ul className="space-y-2.5">
        {inMode.map((track) => {
          const unavailable = missing.has(track.id) || !storageBase || !track.file_path;
          const isCurrent = track.id === currentId;

          return (
            <li key={track.id}>
              <div
                className={cn(
                  "surface flex items-center gap-3 p-4",
                  isCurrent && "border-sage",
                )}
              >
                <button
                  type="button"
                  onClick={() => toggle(track)}
                  disabled={unavailable}
                  aria-label={`${isCurrent && playing ? dict.music.pause : dict.music.play} ${track.title}`}
                  className={cn(
                    "flex h-10 w-10 shrink-0 items-center justify-center rounded-pill transition-colors",
                    unavailable
                      ? "bg-black/[0.05] text-ink-faint"
                      : "bg-sage-soft text-sage-dark hover:bg-sage hover:text-white",
                  )}
                >
                  {isCurrent && playing ? (
                    <svg width="14" height="14" viewBox="0 0 18 18" aria-hidden="true">
                      <rect x="3" y="2" width="4.5" height="14" rx="1.4" fill="currentColor" />
                      <rect x="10.5" y="2" width="4.5" height="14" rx="1.4" fill="currentColor" />
                    </svg>
                  ) : (
                    <svg width="14" height="14" viewBox="0 0 18 18" aria-hidden="true">
                      <path d="M4 2.6 L15 9 L4 15.4 Z" fill="currentColor" />
                    </svg>
                  )}
                </button>

                <div className="min-w-0 flex-1">
                  <p className="text-section truncate">{track.title}</p>
                  <p className="text-small mt-0.5 truncate text-ink-faint">
                    {track.instruments.map((i) => i.replace(/_/g, " ")).join(" · ")}
                  </p>
                </div>

                <div className="flex shrink-0 items-center gap-2">
                  {track.bpm_min && track.bpm_max ? (
                    <Chip colorToken="dusty_blue">
                      {track.bpm_min}–{track.bpm_max}
                    </Chip>
                  ) : null}
                  {unavailable ? <Pill>{dict.music.comingSoon}</Pill> : null}
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
