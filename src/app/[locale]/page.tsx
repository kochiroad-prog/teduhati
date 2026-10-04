import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AGES, DECOR, PILLARS, SCENES, TUMI, type PillarKey } from "@/lib/assets";
import { ButtonLink } from "@/components/ui";
import { href, isLocale, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { formatRupiah, PRICING } from "@/lib/entitlements";
import { getSession } from "@/lib/queries";
import { cn } from "@/lib/utils";

/**
 * The public landing page.
 *
 * Built to the brand mockup: a serif display voice for headlines, the sticker
 * illustrations throughout, and the terracotta accent carrying the second half
 * of each headline. Everything below the hero is a plain section on cream, so
 * the illustrations are the thing that carries the page rather than decoration
 * stacked on top of it.
 */

export const revalidate = 3600;

function landingCopy(locale: Locale) {
  const id = {
    nav: ["Fitur", "Usia", "Harga", "Tanya Jawab"],
    badge: "Parenting companion untuk anak 0–5 tahun",
    headLead: "Menemani tumbuh",
    headTail: "dengan penuh hati.",
    sub: "Temukan aktivitas, cerita, musik, dan panduan yang membantu Anda menciptakan momen kecil yang berarti setiap hari bersama si kecil.",
    ctaPrimary: "Mulai gratis",
    ctaSecondary: "Lihat paket",
    tumiSays: "Halo, aku Tumi! Yuk tumbuh bersama.",
    pillars: [
      ["aktivitas", "Aktivitas harian", "10 menit berkualitas"],
      ["cerita", "Cerita interaktif", "untuk imajinasi & bahasa"],
      ["musik", "Musik menenangkan", "untuk bermain & tidur"],
      ["ai", "Asisten parenting", "jawaban untuk pertanyaan Anda"],
      ["perjalanan", "Perjalanan tumbuh", "setiap momen berarti"],
    ] as [PillarKey, string, string][],

    activityTag: "Aktivitas Harian",
    activityHeadLead: "10 menit yang",
    activityHeadTail: "penuh makna.",
    activityBody:
      "Aktivitas sederhana, dipilih dari usia dan tahap perkembangan anak, yang bisa dilakukan di rumah. Tidak perlu alat khusus, hanya waktu berkualitas bersama si kecil.",
    activityCta: "Lihat contoh aktivitas",

    storyTag: "Cerita Interaktif",
    storyHeadLead: "Dunia cerita",
    storyHeadTail: "untuk imajinasi besar.",
    storyBody:
      "Cerita dengan ilustrasi menawan, bahasa lembut, dan pilihan yang bisa melibatkan anak.",

    musicTag: "Musik & Bedtime",
    musicHeadLead: "Musik yang menenangkan",
    musicHeadTail: "untuk setiap momen.",
    musicBody:
      "Dari pagi yang ceria hingga malam yang tenang. Empat suasana yang menyesuaikan waktu dan kegiatan.",

    growthTag: "Perjalanan Tumbuh",
    growthHeadLead: "Lihat setiap momen,",
    growthHeadTail: "menjadi langkah besar.",
    growthBody:
      "Setiap aktivitas yang selesai menumbuhkan satu petak di Kebun Tumbuh. Ini catatan kebersamaan, bukan penilaian perkembangan.",
    growthStages: ["Benih", "Tunas", "Tanaman", "Bunga", "Pohon"],

    ageTag: "Untuk Setiap Usia 0–5 Tahun",
    ageHeadLead: "Karena setiap tahap",
    ageHeadTail: "tumbuh itu unik.",
    ageBody:
      "Konten dan rekomendasi menyesuaikan usia anak, dihitung otomatis dari tanggal lahirnya.",
    ages: [
      ["baby", "0–6 bulan", "Bonding, suara, dan visual sederhana"],
      ["toddler", "6–24 bulan", "Eksplorasi dan keterampilan dasar"],
      ["preschool", "2–3 tahun", "Bahasa, motorik, dan kemandirian"],
      ["older", "4–5 tahun", "Kreativitas, sosial, dan siap sekolah"],
    ] as [keyof typeof AGES, string, string][],

    priceTag: "Harga",
    priceHeadLead: "Mulai gratis,",
    priceHeadTail: "lanjutkan kalau cocok.",
    freeName: "Gratis",
    freePrice: "Rp0",
    freeNote: "Selamanya",
    premiumName: "Premium",
    premiumNote: "Tanpa kontrak, bisa berhenti kapan saja",
    annualNote: `atau ${formatRupiah(PRICING.annual.amount)}/tahun`,
    popular: "Paling banyak dipilih",

    faqTag: "Tanya Jawab",
    faqHead: "Yang sering ditanyakan.",
    faqs: [
      [
        "Apakah anak saya perlu memegang layar?",
        "Tidak. Hampir semua aktivitas dilakukan tanpa layar — aplikasinya untuk Anda, bukan untuk anak. Hanya cerita yang dibaca bersama.",
      ],
      [
        "Apakah ini menilai perkembangan anak saya?",
        "Bukan. Kebun Tumbuh mencatat waktu yang Anda habiskan bersama, bukan skor perkembangan. Untuk kekhawatiran tumbuh kembang, bicarakan dengan dokter atau tenaga kesehatan.",
      ],
      [
        "Perlu beli alat atau mainan khusus?",
        "Tidak. Aktivitasnya memakai benda yang sudah ada di rumah — kain, sendok, kardus, botol. Anda juga bisa menyaring aktivitas berdasarkan bahan yang Anda punya.",
      ],
      [
        "Berapa anak yang bisa didaftarkan?",
        "Paket gratis untuk satu anak. Premium untuk tiga anak, dengan riwayat terpisah untuk masing-masing.",
      ],
      [
        "Siapa yang menulis aktivitasnya?",
        "Ditulis sendiri oleh tim TEDUHATI, dengan kerangka usia dan domain yang mengacu pada rujukan pengasuhan yang diakui. Sebelum rilis komersial, konten untuk bayi ditinjau tenaga profesional.",
      ],
    ] as [string, string][],

    footerTag: "Menemani tumbuh dengan penuh hati",
    footerNote:
      "TEDUHATI bukan alat diagnosis medis. Untuk pertanyaan kesehatan atau tumbuh kembang anak, hubungi dokter atau tenaga kesehatan.",
    footerRights: "Hak cipta dilindungi.",
  };

  const en: typeof id = {
    nav: ["Features", "Ages", "Pricing", "FAQ"],
    badge: "A parenting companion for children aged 0–5",
    headLead: "Growing together,",
    headTail: "with heart.",
    sub: "Activities, stories, music and guidance that help you make small, meaningful moments with your child every day.",
    ctaPrimary: "Start free",
    ctaSecondary: "See plans",
    tumiSays: "Hello, I'm Tumi! Let's grow together.",
    pillars: [
      ["aktivitas", "Daily activities", "ten good minutes"],
      ["cerita", "Interactive stories", "for imagination and language"],
      ["musik", "Calming music", "for play and for sleep"],
      ["ai", "Parenting assistant", "answers to your questions"],
      ["perjalanan", "Growth journey", "every moment counts"],
    ],
    activityTag: "Daily Activities",
    activityHeadLead: "Ten minutes",
    activityHeadTail: "that mean something.",
    activityBody:
      "Simple activities, chosen from your child's age and stage, that work at home. No special equipment, just time together.",
    activityCta: "See an example",
    storyTag: "Interactive Stories",
    storyHeadLead: "A world of stories",
    storyHeadTail: "for a big imagination.",
    storyBody:
      "Stories with warm illustrations, gentle language, and choices that bring your child into them.",
    musicTag: "Music & Bedtime",
    musicHeadLead: "Music that settles",
    musicHeadTail: "every part of the day.",
    musicBody:
      "From a bright morning to a quiet night. Four moods that follow the time and the activity.",
    growthTag: "Growth Journey",
    growthHeadLead: "Watch small moments",
    growthHeadTail: "become big steps.",
    growthBody:
      "Every finished activity grows one bed in the Growth Garden. It is a record of time together, not a developmental assessment.",
    growthStages: ["Seed", "Sprout", "Plant", "Flower", "Tree"],
    ageTag: "For Every Age 0–5",
    ageHeadLead: "Because every stage",
    ageHeadTail: "of growing is its own.",
    ageBody:
      "Content and recommendations follow your child's age, worked out automatically from their birth date.",
    ages: [
      ["baby", "0–6 months", "Bonding, sound, and simple visuals"],
      ["toddler", "6–24 months", "Exploring and first skills"],
      ["preschool", "2–3 years", "Language, movement, independence"],
      ["older", "4–5 years", "Creativity, friendship, school readiness"],
    ],
    priceTag: "Pricing",
    priceHeadLead: "Start free,",
    priceHeadTail: "continue if it fits.",
    freeName: "Free",
    freePrice: "Rp0",
    freeNote: "Forever",
    premiumName: "Premium",
    premiumNote: "No contract, cancel any time",
    annualNote: `or ${formatRupiah(PRICING.annual.amount)}/year`,
    popular: "Most chosen",
    faqTag: "FAQ",
    faqHead: "Questions people ask.",
    faqs: [
      [
        "Does my child need to hold a screen?",
        "No. Nearly every activity happens away from the screen — the app is for you, not for your child. Only the stories are read together.",
      ],
      [
        "Does this assess my child's development?",
        "No. The Growth Garden records the time you spend together, not a developmental score. For concerns about development, speak to a doctor or health professional.",
      ],
      [
        "Do I need to buy special toys?",
        "No. Activities use what is already at home — cloth, a spoon, a box, a bottle. You can also filter by the materials you actually have.",
      ],
      [
        "How many children can I add?",
        "The free plan covers one child. Premium covers three, each with their own history.",
      ],
      [
        "Who writes the activities?",
        "The TEDUHATI team writes them, with the age and domain framework drawn from recognised parenting references. Before commercial release, content for babies is reviewed by qualified professionals.",
      ],
    ],
    footerTag: "Growing together, with heart",
    footerNote:
      "TEDUHATI is not a medical diagnostic tool. For questions about your child's health or development, contact a doctor or health professional.",
    footerRights: "All rights reserved.",
  };

  return locale === "en" ? en : id;
}

/* -------------------------------------------------------------------------- */
/* building blocks                                                            */
/* -------------------------------------------------------------------------- */

function Tag({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-meta inline-flex items-center rounded-pill bg-white/70 px-3.5 py-1.5 text-sage-dark ring-1 ring-[#ccd9cf]">
      {children}
    </span>
  );
}

/** Headline: serif, with the second half in terracotta, as the mockup sets it. */
function Headline({
  lead,
  tail,
  className,
}: {
  lead: string;
  tail: string;
  className?: string;
}) {
  return (
    <h2 className={cn("font-display text-ink", className)}>
      {lead}{" "}
      <span className="text-terracotta">{tail}</span>
    </h2>
  );
}

function Section({
  id,
  className,
  children,
}: {
  id?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className={cn("px-5 py-16 sm:py-24", className)}>
      <div className="mx-auto w-full max-w-[1080px]">{children}</div>
    </section>
  );
}

/* -------------------------------------------------------------------------- */

export default async function LandingPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: raw } = await params;
  if (!isLocale(raw)) notFound();
  const locale = raw;
  const dict = getDictionary(locale);
  const c = landingCopy(locale);

  // Signed-in visitors still get the marketing page, but the call to action
  // takes them into the app instead of asking them to sign up again.
  const session = await getSession();
  const signedIn = Boolean(session);

  return (
    <div className="min-h-dvh bg-cream">
      {/* ---------------------------------------------------------- header */}
      <header className="sticky top-0 z-30 border-b border-line/70 bg-cream/85 backdrop-blur">
        <div className="mx-auto flex h-16 w-full max-w-[1080px] items-center justify-between px-5">
          <Link href={href(locale, "landing")} className="flex items-center gap-2">
            <Image src={PILLARS.aktivitas.src} alt="" width={26} height={26} />
            <span className="font-display text-[1.125rem] font-semibold text-sage-dark">
              Teduhati
            </span>
          </Link>

          <nav className="hidden items-center gap-7 md:flex">
            {["fitur", "usia", "harga", "faq"].map((anchor, i) => (
              <a
                key={anchor}
                href={`#${anchor}`}
                className="text-small text-ink-muted transition-colors hover:text-ink"
              >
                {c.nav[i]}
              </a>
            ))}
          </nav>

          <ButtonLink href={signedIn ? href(locale, "home") : href(locale, "signUp")} size="md">
            {signedIn
              ? locale === "en"
                ? "Open the app"
                : "Buka aplikasi"
              : c.ctaPrimary}
          </ButtonLink>
        </div>
      </header>

      {/* ------------------------------------------------------------ hero */}
      <div className="relative overflow-hidden">
        <Image
          src={DECOR.leafA.src}
          alt=""
          width={DECOR.leafA.width}
          height={DECOR.leafA.height}
          className="pointer-events-none absolute -left-10 top-10 w-28 opacity-45 sm:w-36"
        />
        <Image
          src={DECOR.leafB.src}
          alt=""
          width={DECOR.leafB.width}
          height={DECOR.leafB.height}
          className="pointer-events-none absolute -right-8 bottom-6 w-24 opacity-35 sm:w-32"
        />

        <div className="mx-auto grid w-full max-w-[1080px] items-center gap-10 px-5 py-14 sm:py-20 md:grid-cols-[1fr_1.05fr]">
          <div>
            <Tag>{c.badge}</Tag>

            <h1 className="font-display mt-5 text-[clamp(2.25rem,1.6rem+3.1vw,3.5rem)] leading-[1.06] text-ink">
              {c.headLead}
              <br />
              <span className="text-terracotta">{c.headTail}</span>
            </h1>

            <p className="text-body mt-5 max-w-[46ch] text-ink-muted">{c.sub}</p>

            <div className="mt-7 flex flex-wrap gap-3">
              <ButtonLink
                href={signedIn ? href(locale, "home") : href(locale, "signUp")}
                size="lg"
              >
                {signedIn
                  ? locale === "en"
                    ? "Open the app"
                    : "Buka aplikasi"
                  : c.ctaPrimary}
              </ButtonLink>
              <ButtonLink href="#harga" tone="secondary" size="lg">
                {c.ctaSecondary}
              </ButtonLink>
            </div>
          </div>

          <div className="relative">
            <Image
              src={SCENES.heroFamily.src}
              alt={SCENES.heroFamily.alt}
              width={SCENES.heroFamily.width}
              height={SCENES.heroFamily.height}
              priority
              className="mx-auto w-full max-w-[520px]"
            />
            {/* Tumi introduces himself, pointing back into the picture. */}
            <p className="text-small absolute -top-1 right-0 max-w-[12rem] rounded-[18px_18px_18px_4px] bg-white px-4 py-2.5 text-ink shadow-lift ring-1 ring-line sm:right-4">
              {c.tumiSays}
            </p>
          </div>
        </div>
      </div>

      {/* --------------------------------------------------------- pillars */}
      <div id="fitur" className="border-y border-line/70 bg-[#fffdf8]">
        <ul className="mx-auto grid w-full max-w-[1080px] gap-x-6 gap-y-7 px-5 py-9 sm:grid-cols-2 lg:grid-cols-5">
          {c.pillars.map(([key, title, note]) => (
            <li key={key} className="flex items-center gap-3">
              <Image
                src={PILLARS[key].src}
                alt=""
                width={PILLARS[key].width}
                height={PILLARS[key].height}
                className="h-10 w-10 shrink-0 object-contain"
              />
              <div className="min-w-0">
                <p className="text-section">{title}</p>
                <p className="text-small text-ink-faint">{note}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>

      {/* -------------------------------------------------------- activity */}
      <Section>
        <div className="grid items-center gap-10 md:grid-cols-2">
          <div className="relative order-2 flex justify-center md:order-1">
            <Image
              src={SCENES.phoneUi.src}
              alt={SCENES.phoneUi.alt}
              width={SCENES.phoneUi.width}
              height={SCENES.phoneUi.height}
              className="w-[clamp(190px,42vw,280px)]"
            />
            <Image
              src={SCENES.activityCard.src}
              alt={SCENES.activityCard.alt}
              width={SCENES.activityCard.width}
              height={SCENES.activityCard.height}
              className="absolute -right-2 bottom-4 w-[clamp(130px,26vw,190px)] drop-shadow-xl sm:-right-6"
            />
          </div>

          <div className="order-1 md:order-2">
            <Tag>{c.activityTag}</Tag>
            <Headline
              lead={c.activityHeadLead}
              tail={c.activityHeadTail}
              className="mt-4 text-[clamp(1.75rem,1.3rem+2vw,2.5rem)] leading-[1.1]"
            />
            <p className="text-body mt-4 max-w-[44ch] text-ink-muted">{c.activityBody}</p>
            <ButtonLink
              href={signedIn ? href(locale, "activities") : href(locale, "signUp")}
              tone="secondary"
              className="mt-6"
            >
              {c.activityCta}
            </ButtonLink>
          </div>
        </div>
      </Section>

      {/* ------------------------------------------------ stories + music */}
      <Section className="pt-0">
        <div className="grid gap-5 md:grid-cols-2">
          {[
            {
              tag: c.storyTag,
              lead: c.storyHeadLead,
              tail: c.storyHeadTail,
              body: c.storyBody,
              img: SCENES.story,
              bg: "bg-[#eef1f6]",
            },
            {
              tag: c.musicTag,
              lead: c.musicHeadLead,
              tail: c.musicHeadTail,
              body: c.musicBody,
              img: SCENES.bedtime,
              bg: "bg-[#f1ece9]",
            },
          ].map((card) => (
            <article
              key={card.tag}
              className={cn("rounded-[26px] p-6 sm:p-8", card.bg)}
            >
              <Tag>{card.tag}</Tag>
              <Headline
                lead={card.lead}
                tail={card.tail}
                className="mt-4 text-[clamp(1.4rem,1.1rem+1.2vw,1.9rem)] leading-[1.15]"
              />
              <p className="text-small mt-3 max-w-[38ch] text-ink-muted">{card.body}</p>
              <Image
                src={card.img.src}
                alt={card.img.alt}
                width={card.img.width}
                height={card.img.height}
                className="mt-6 w-full rounded-[18px]"
              />
            </article>
          ))}
        </div>
      </Section>

      {/* ---------------------------------------------------------- garden */}
      <Section className="pt-0">
        <div className="rounded-[26px] bg-[#f3f0e4] p-6 sm:p-10">
          <div className="grid items-center gap-8 md:grid-cols-[0.9fr_1.1fr]">
            <div>
              <Tag>{c.growthTag}</Tag>
              <Headline
                lead={c.growthHeadLead}
                tail={c.growthHeadTail}
                className="mt-4 text-[clamp(1.6rem,1.2rem+1.6vw,2.25rem)] leading-[1.12]"
              />
              <p className="text-small mt-4 max-w-[40ch] text-ink-muted">{c.growthBody}</p>
            </div>

            <div>
              <Image
                src={SCENES.growth.src}
                alt={SCENES.growth.alt}
                width={SCENES.growth.width}
                height={SCENES.growth.height}
                className="w-full"
              />
              <ol className="mt-3 flex justify-between gap-2 px-1">
                {c.growthStages.map((stage) => (
                  <li key={stage} className="text-meta text-ink-faint">
                    {stage}
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </div>
      </Section>

      {/* ------------------------------------------------------------- age */}
      <Section id="usia" className="pt-0">
        <div className="grid gap-8 md:grid-cols-[0.85fr_1.15fr] md:items-start">
          <div>
            <Tag>{c.ageTag}</Tag>
            <Headline
              lead={c.ageHeadLead}
              tail={c.ageHeadTail}
              className="mt-4 text-[clamp(1.6rem,1.2rem+1.6vw,2.25rem)] leading-[1.12]"
            />
            <p className="text-small mt-4 max-w-[38ch] text-ink-muted">{c.ageBody}</p>
          </div>

          <ul className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {c.ages.map(([key, label, note]) => (
              <li
                key={key}
                className="rounded-[20px] border border-line bg-[#fffdf8] p-4 text-center"
              >
                <Image
                  src={AGES[key].src}
                  alt={AGES[key].alt}
                  width={AGES[key].width}
                  height={AGES[key].height}
                  className="mx-auto h-24 w-auto object-contain"
                />
                <p className="text-section mt-3">{label}</p>
                <p className="text-small mt-1 text-ink-faint">{note}</p>
              </li>
            ))}
          </ul>
        </div>
      </Section>

      {/* --------------------------------------------------------- pricing */}
      <Section id="harga" className="pt-0">
        <div className="text-center">
          <Tag>{c.priceTag}</Tag>
          <Headline
            lead={c.priceHeadLead}
            tail={c.priceHeadTail}
            className="mt-4 text-[clamp(1.6rem,1.2rem+1.6vw,2.25rem)] leading-[1.12]"
          />
        </div>

        <div className="mx-auto mt-10 grid max-w-[760px] gap-5 sm:grid-cols-2">
          <article className="rounded-[22px] border border-line bg-[#fffdf8] p-7">
            <p className="text-section">{c.freeName}</p>
            <p className="font-display mt-2 text-[2rem] leading-none text-ink">
              {c.freePrice}
            </p>
            <p className="text-small mt-1 text-ink-faint">{c.freeNote}</p>
            <ul className="mt-5 space-y-2">
              {dict.plans.freeList.map((item) => (
                <li key={item} className="text-small flex gap-2 text-ink-muted">
                  <span aria-hidden="true" className="text-sage">
                    &#10003;
                  </span>
                  {item}
                </li>
              ))}
            </ul>
            <ButtonLink
              href={href(locale, "signUp")}
              tone="secondary"
              className="mt-6 w-full"
            >
              {c.ctaPrimary}
            </ButtonLink>
          </article>

          <article className="relative rounded-[22px] border border-[#c9d8cd] bg-sage-soft p-7">
            <span className="text-meta absolute -top-3 left-7 rounded-pill bg-sage px-3 py-1 text-white">
              {c.popular}
            </span>
            <p className="text-section">{c.premiumName}</p>
            <p className="font-display mt-2 text-[2rem] leading-none text-ink">
              {formatRupiah(PRICING.premium.amount)}
              <span className="text-small font-sans font-normal text-ink-muted">
                {dict.plans.perMonth}
              </span>
            </p>
            <p className="text-small mt-1 text-ink-faint">{c.annualNote}</p>
            <ul className="mt-5 space-y-2">
              {dict.plans.premiumList.map((item) => (
                <li key={item} className="text-small flex gap-2 text-ink-muted">
                  <span aria-hidden="true" className="text-sage-dark">
                    &#10003;
                  </span>
                  {item}
                </li>
              ))}
            </ul>
            <ButtonLink href={href(locale, "signUp")} className="mt-6 w-full">
              {c.ctaPrimary}
            </ButtonLink>
            <p className="text-small mt-3 text-center text-ink-faint">{c.premiumNote}</p>
          </article>
        </div>
      </Section>

      {/* ------------------------------------------------------------- faq */}
      <Section id="faq" className="pt-0">
        <div className="mx-auto max-w-[720px]">
          <div className="text-center">
            <Tag>{c.faqTag}</Tag>
            <h2 className="font-display mt-4 text-[clamp(1.6rem,1.2rem+1.6vw,2.25rem)] leading-[1.12] text-ink">
              {c.faqHead}
            </h2>
          </div>

          <div className="mt-8 divide-y divide-line border-y border-line">
            {c.faqs.map(([q, aText]) => (
              <details key={q} className="group py-4">
                <summary className="text-section flex cursor-pointer list-none items-center justify-between gap-4">
                  {q}
                  <span
                    aria-hidden="true"
                    className="shrink-0 text-ink-faint transition-transform group-open:rotate-45"
                  >
                    +
                  </span>
                </summary>
                <p className="text-small mt-3 max-w-[60ch] text-ink-muted">{aText}</p>
              </details>
            ))}
          </div>
        </div>
      </Section>

      {/* ----------------------------------------------------- closing cta */}
      <Section className="pt-0">
        <div className="relative overflow-hidden rounded-[26px] bg-sage-soft px-6 py-12 text-center sm:px-10">
          <Image
            src={DECOR.cloud.src}
            alt=""
            width={DECOR.cloud.width}
            height={DECOR.cloud.height}
            className="pointer-events-none absolute left-6 top-6 w-20 opacity-70"
          />
          <Image
            src={DECOR.butterfly.src}
            alt=""
            width={DECOR.butterfly.width}
            height={DECOR.butterfly.height}
            className="pointer-events-none absolute right-8 top-10 w-10 opacity-80"
          />
          <Image
            src={TUMI.love.src}
            alt={TUMI.love.alt}
            width={TUMI.love.width}
            height={TUMI.love.height}
            className="mx-auto w-28 sm:w-32"
          />
          <h2 className="font-display mt-4 text-[clamp(1.5rem,1.2rem+1.4vw,2rem)] leading-[1.12] text-ink">
            {c.headLead} <span className="text-terracotta">{c.headTail}</span>
          </h2>
          <ButtonLink
            href={signedIn ? href(locale, "home") : href(locale, "signUp")}
            size="lg"
            className="mt-6"
          >
            {signedIn
              ? locale === "en"
                ? "Open the app"
                : "Buka aplikasi"
              : c.ctaPrimary}
          </ButtonLink>
        </div>
      </Section>

      {/* ---------------------------------------------------------- footer */}
      <footer className="border-t border-line bg-[#fffdf8]">
        <div className="mx-auto w-full max-w-[1080px] px-5 py-10">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Image src={PILLARS.aktivitas.src} alt="" width={22} height={22} />
              <span className="font-display text-[1rem] font-semibold text-sage-dark">
                Teduhati
              </span>
            </div>
            <p className="text-small text-ink-faint">{c.footerTag}</p>
          </div>

          <p className="text-small mt-6 max-w-[62ch] text-ink-faint">{c.footerNote}</p>
          <p className="text-small mt-4 text-ink-faint">
            &copy; {new Date().getFullYear()} TEDUHATI. {c.footerRights}
          </p>
        </div>
      </footer>
    </div>
  );
}
