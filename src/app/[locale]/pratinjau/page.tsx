import { notFound } from "next/navigation";
import { GardenPlant } from "@/components/GardenPlant";
import { Tumi, type TumiState } from "@/components/Tumi";
import {
  Button,
  Card,
  Chip,
  LeafCard,
  Notice,
  Pill,
  SectionHead,
  StepDots,
} from "@/components/ui";
import { isLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { GARDEN_STAGES, SWATCHES, type ColorToken } from "@/lib/tokens";

/**
 * Design reference.
 *
 * Every token, every component state, and the three screens that matter, on one
 * page with fixed content. It exists so a change to the design system can be
 * reviewed without signing in and without seeding a database.
 *
 * Development only: shipping it would hand anyone a page that looks like the
 * product but holds invented child data.
 */
export default async function PreviewPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  if (process.env.NODE_ENV === "production") notFound();

  const { locale: raw } = await params;
  if (!isLocale(raw)) notFound();
  const dict = getDictionary(raw);

  const tumiStates: TumiState[] = [
    "idle",
    "happy",
    "excited",
    "thinking",
    "sleepy",
    "celebrate",
  ];

  const gardenBeds: { name: string; token: ColorToken; done: number }[] = [
    { name: "Sosial & Emosi", token: "terracotta", done: 11 },
    { name: "Bahasa", token: "sage", done: 7 },
    { name: "Berpikir", token: "dusty_blue", done: 4 },
    { name: "Gerak", token: "yellow", done: 2 },
    { name: "Sensori", token: "clay", done: 1 },
    { name: "Kreativitas", token: "plum", done: 0 },
  ];

  return (
    <div className="mx-auto max-w-[760px] px-4 py-10">
      <h1 className="text-display">TEDUHATI</h1>
      <p className="text-small mt-1 text-ink-muted">
        {dict.brand.tagline} · design reference
      </p>

      {/* ------------------------------------------------------------ colour */}
      <section className="mt-10">
        <SectionHead title="Colour" />
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
          {(Object.keys(SWATCHES) as ColorToken[]).map((token) => (
            <div key={token}>
              <div
                className="h-16 rounded-card border"
                style={{ background: SWATCHES[token].ink, borderColor: SWATCHES[token].line }}
              />
              <div
                className="mt-1 h-7 rounded-[8px] border"
                style={{ background: SWATCHES[token].soft, borderColor: SWATCHES[token].line }}
              />
              <p className="text-meta mt-1.5 text-ink-muted">{token}</p>
            </div>
          ))}
        </div>
        <div className="mt-3 grid grid-cols-4 gap-2">
          {[
            ["cream", "#f8f4ea"],
            ["cream-deep", "#f0e9d9"],
            ["ink", "#273029"],
            ["line", "#e3dccb"],
          ].map(([name, hex]) => (
            <div key={name}>
              <div
                className="h-12 rounded-card border border-line"
                style={{ background: hex }}
              />
              <p className="text-meta mt-1.5 text-ink-muted">{name}</p>
            </div>
          ))}
        </div>
      </section>

      {/* -------------------------------------------------------------- type */}
      <section className="mt-10">
        <SectionHead title="Type" />
        <div className="surface space-y-3 p-5">
          <p className="text-display">Menemani tumbuh</p>
          <p className="text-title">Kain Rahasia</p>
          <p className="text-section">Aktivitas hari ini</p>
          <p className="text-body max-w-[52ch]">
            Satu hal kecil untuk dilakukan bersama hari ini. Hanya sepuluh menit,
            tetapi cukup untuk menjadi waktu yang berarti bersama anak.
          </p>
          <p className="text-small text-ink-muted">19 bulan · Menemukan Kata</p>
          <p className="text-meta text-ink-faint">Sensori + Bonding</p>
        </div>
      </section>

      {/* -------------------------------------------------------------- Tumi */}
      <section className="mt-10">
        <SectionHead title="Tumi" />
        <div className="surface grid grid-cols-3 gap-4 p-5 sm:grid-cols-6">
          {tumiStates.map((state) => (
            <div key={state} className="text-center">
              <Tumi state={state} size={72} className="mx-auto" />
              <p className="text-meta mt-1 text-ink-muted">{state}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ------------------------------------------------------------ garden */}
      <section className="mt-10">
        <SectionHead title="Kebun Tumbuh — stages" />
        <div className="surface grid grid-cols-5 gap-3 p-5">
          {GARDEN_STAGES.map((stage) => (
            <div key={stage} className="text-center">
              <GardenPlant stage={stage} colorToken="sage" size={64} />
              <p className="text-meta mt-1 text-ink-muted">{dict.garden.stage[stage]}</p>
            </div>
          ))}
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {gardenBeds.map((bed) => {
            const stage =
              bed.done === 0
                ? "seed"
                : bed.done <= 2
                  ? "sprout"
                  : bed.done <= 5
                    ? "plant"
                    : bed.done <= 9
                      ? "flower"
                      : "tree";
            return (
              <div key={bed.name} className="leaf-sm border border-line bg-white p-4">
                <div className="flex justify-center">
                  <GardenPlant stage={stage} colorToken={bed.token} size={76} />
                </div>
                <p className="text-section mt-2 text-center">{bed.name}</p>
                <p className="text-small mt-0.5 text-center text-ink-faint">
                  {dict.garden.stage[stage]}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      {/* -------------------------------------------------------- components */}
      <section className="mt-10">
        <SectionHead title="Components" />

        <div className="space-y-4">
          <div className="surface flex flex-wrap items-center gap-3 p-5">
            <Button>Mulai</Button>
            <Button tone="secondary">Kembali</Button>
            <Button tone="quiet">Lewati</Button>
            <Button tone="danger">Hapus profil</Button>
            <Button disabled>Memuat</Button>
          </div>

          <div className="surface flex flex-wrap items-center gap-2 p-5">
            <Chip colorToken="sage">10 menit</Chip>
            <Chip colorToken="clay">Sensori</Chip>
            <Chip colorToken="plum">Interaktif</Chip>
            <Chip colorToken="dusty_blue">75–90 BPM</Chip>
            <Pill>Premium</Pill>
          </div>

          <LeafCard>
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-meta text-sage-dark">{dict.home.todayLabel}</p>
                <h2 className="text-title mt-1.5">Kain Rahasia</h2>
              </div>
              <Tumi state="excited" size={64} className="shrink-0" />
            </div>
            <p className="text-small mt-3 max-w-[40ch] text-ink-muted">
              Sentuhkan dua jenis kain ke tangan dan kaki bayi, satu per satu.
            </p>
            <div className="mt-4 flex gap-2">
              <Chip colorToken="sage">7 menit</Chip>
              <Chip colorToken="clay">Sensori</Chip>
            </div>
            <Button size="lg" className="mt-5 w-full">
              {dict.home.start}
            </Button>
          </LeafCard>

          <Card>
            <p className="text-meta text-ink-faint">{dict.activity.goal}</p>
            <p className="text-small mt-1.5">
              Mengenalkan perbedaan tekstur melalui kulit, pintu masuk pertama bayi
              memahami dunia benda.
            </p>
          </Card>

          <Notice tone="care" title={dict.activity.safety}>
            Hanya gunakan kain bersih, tanpa benang lepas, dan tidak berbulu halus.
            Jangan biarkan kain menutupi wajah bayi.
          </Notice>

          <Notice>{dict.garden.disclaimer}</Notice>

          <div className="surface flex items-center justify-between gap-4 p-5">
            <StepDots total={5} current={2} />
            <p className="text-meta text-ink-faint">Langkah 3 dari 5</p>
          </div>
        </div>
      </section>

      <p className="text-small mt-12 text-ink-faint">
        Development only. This page is not served in production.
      </p>
    </div>
  );
}
