import type { Locale } from "./config";

/**
 * Interface copy. Content (activities, stories, bonding prompts) is translated
 * in the database, not here — this file only covers chrome the app itself owns.
 *
 * Voice rules, applied throughout:
 *   - A button says what happens. "Mulai" leads to a screen that has started.
 *   - An empty screen invites an action rather than reporting emptiness.
 *   - An error says what went wrong and what to do, without apologising.
 *   - Progress is reflective. Never a score, never a percentage, never a verdict.
 */
const id = {
  brand: {
    name: "TEDUHATI",
    tagline: "Menemani tumbuh dengan penuh hati",
  },

  nav: {
    home: "Beranda",
    activities: "Aktivitas",
    stories: "Cerita",
    garden: "Tumbuh",
  },

  greeting: {
    dawn: "Selamat pagi",
    morning: "Selamat pagi",
    afternoon: "Selamat siang",
    evening: "Selamat sore",
    night: "Selamat malam",
    noName: "Halo",
  },

  home: {
    todayLabel: "Aktivitas hari ini",
    todayLead: "Satu hal kecil untuk dilakukan bersama hari ini.",
    start: "Mulai",
    alsoToday: "Pilihan lain hari ini",
    bondingLabel: "Momen bonding",
    bondingDone: "Sudah kami lakukan",
    bondingDoneAck: "Tercatat. Terima kasih sudah hadir untuknya.",
    musicLabel: "Musik untuk sekarang",
    storyLabel: "Cerita sebelum tidur",
    gardenPeek: "Lihat Kebun Tumbuh",
    addChild: "Tambahkan anak",
    addChildLead:
      "Masukkan tanggal lahir anak, lalu TEDUHATI menyesuaikan aktivitas dengan usianya.",
    switchChild: "Ganti anak",
  },

  activity: {
    minutes: "menit",
    materials: "Bahan",
    noMaterials: "Tidak perlu bahan apa pun",
    goal: "Yang dilatih",
    steps: "Langkah",
    stepOf: "Langkah {current} dari {total}",
    next: "Lanjut",
    back: "Kembali",
    finish: "Selesai",
    tip: "Tips untuk orang tua",
    safety: "Catatan keamanan",
    variations: "Variasi",
    done: "Aktivitas selesai",
    doneLead: "Kebun {child} bertambah sedikit hari ini.",
    howWasIt: "Bagaimana reaksinya?",
    moodLoved: "Senang sekali",
    moodOkay: "Biasa saja",
    moodNotToday: "Belum mau",
    saveAndClose: "Simpan dan tutup",
    skipRating: "Lewati",
    filterTitle: "Saring aktivitas",
    filterDuration: "Waktu yang ada",
    filterDomain: "Area",
    filterMaterials: "Bahan di rumah",
    filterAny: "Semua",
    filterApply: "Terapkan",
    filterReset: "Hapus saringan",
    empty: "Belum ada aktivitas yang cocok dengan saringan ini. Coba lebarkan pilihan waktu atau bahan.",
  },

  garden: {
    title: "Kebun Tumbuh",
    lead: "Setiap aktivitas yang selesai menumbuhkan satu petak.",
    disclaimer:
      "Kebun ini catatan kebersamaan, bukan penilaian perkembangan. Untuk kekhawatiran tentang tumbuh kembang anak, bicarakan dengan dokter atau tenaga kesehatan.",
    stage: {
      seed: "Benih",
      sprout: "Tunas",
      plant: "Tanaman",
      flower: "Bunga",
      tree: "Pohon",
    },
    activityCount: "{count} aktivitas",
    nextStage: "{remaining} aktivitas lagi menuju {stage}",
    fullGrown: "Sudah tumbuh penuh",
    emptyTitle: "Kebun masih kosong",
    emptyLead: "Selesaikan satu aktivitas, dan petak pertama akan bertunas.",
    recent: "Terakhir dilakukan",
  },

  stories: {
    title: "Cerita",
    lead: "Cerita pendek untuk dibacakan bersama.",
    read: "Baca",
    continue: "Lanjutkan",
    minutes: "menit membaca",
    interactive: "Interaktif",
    empty: "Belum ada cerita untuk usia ini. Cerita baru ditambahkan setiap bulan.",
    nextPage: "Halaman berikutnya",
    finish: "Tutup cerita",
  },

  bonding: {
    title: "Bonding",
    lead: "Momen satu sampai tiga menit yang bisa diselipkan ke hari biasa.",
    why: "Mengapa ini penting",
    types: {
      morning: "Pagi",
      play: "Saat bermain",
      meal: "Saat makan",
      bath: "Saat mandi",
      outdoor: "Di luar",
      bedtime: "Sebelum tidur",
      anytime: "Kapan saja",
    },
    markDone: "Sudah dilakukan",
    empty: "Momen bonding untuk usia ini sedang disiapkan.",
  },

  music: {
    title: "Musik",
    lead: "Empat suasana, dipilih sesuai waktu dan kegiatan.",
    modes: {
      morning: "Pagi",
      play: "Bermain",
      bonding: "Kedekatan",
      bedtime: "Tidur",
    },
    play: "Putar",
    pause: "Jeda",
    comingSoon: "Track sedang diproduksi",
  },

  ask: {
    title: "Tanya TEDUHATI",
    lead: "Ceritakan situasinya, dan kami bantu menyesuaikan aktivitas.",
    placeholder:
      "Contoh: anak saya 3 tahun suka kendaraan, saya hanya punya kardus, waktu 15 menit.",
    send: "Kirim",
    thinking: "Sedang menyusun jawaban",
    disclaimer:
      "Jawaban ini saran aktivitas, bukan nasihat medis. Untuk masalah kesehatan, hubungi tenaga kesehatan.",
    limitReached:
      "Pertanyaan gratis bulan ini sudah habis. Paket Premium membuka pertanyaan tanpa batas.",
    history: "Pertanyaan sebelumnya",
    empty: "Belum ada pertanyaan. Tulis satu di atas untuk mulai.",
  },

  child: {
    title: "Profil anak",
    name: "Nama anak",
    namePlaceholder: "Nama panggilan saja cukup",
    birthDate: "Tanggal lahir",
    birthDateHelp: "Dipakai untuk menentukan usia dan menyaring aktivitas.",
    interests: "Yang sedang disukai",
    interestsHelp: "Opsional. Membantu kami memilih konteks aktivitas.",
    save: "Simpan profil",
    saved: "Profil tersimpan",
    ageMonths: "{count} bulan",
    ageYears: "{years} tahun {months} bulan",
    ageYearsOnly: "{years} tahun",
    stage: "Tahap",
    addAnother: "Tambah anak lain",
    limitFree: "Paket gratis mencakup satu anak. Premium mencakup tiga.",
    remove: "Hapus profil",
    removeConfirm: "Hapus profil {name}? Riwayat aktivitasnya ikut terhapus.",
  },

  auth: {
    signInTitle: "Masuk ke TEDUHATI",
    signInLead: "Masukkan email, dan kami kirim tautan masuk.",
    email: "Email",
    sendLink: "Kirim tautan masuk",
    linkSent: "Tautan sudah dikirim",
    linkSentLead: "Buka email di {email} dan klik tautannya untuk masuk.",
    signOut: "Keluar",
    checkingLink: "Memeriksa tautan masuk",
    linkInvalid:
      "Tautan ini sudah dipakai atau kedaluwarsa. Minta tautan baru untuk masuk.",
    requestAgain: "Minta tautan baru",
  },

  plans: {
    title: "Paket",
    free: "Gratis",
    premium: "Premium",
    annual: "Tahunan",
    perMonth: "/bulan",
    perYear: "/tahun",
    currentPlan: "Paket Anda sekarang",
    upgrade: "Pilih Premium",
    freeList: [
      "1 profil anak",
      "1 aktivitas per hari",
      "5 cerita per bulan",
      "5 pertanyaan AI per bulan",
    ],
    premiumList: [
      "3 profil anak",
      "Aktivitas dan cerita tanpa batas",
      "Pertanyaan AI tanpa batas",
      "Worksheet yang bisa dicetak",
      "Kebun Tumbuh lengkap",
    ],
    lockedTitle: "Bagian Premium",
    lockedLead: "Buka dengan paket Premium untuk melihat ini.",
  },

  common: {
    loading: "Memuat",
    retry: "Coba lagi",
    cancel: "Batal",
    close: "Tutup",
    save: "Simpan",
    error: "Ada yang tidak berjalan",
    errorLead: "Muat ulang halaman ini. Kalau masih sama, coba lagi beberapa saat lagi.",
    notFound: "Halaman ini tidak ada",
    notFoundLead: "Tautannya mungkin sudah berubah. Kembali ke beranda untuk melanjutkan.",
    backHome: "Ke beranda",
    language: "Bahasa",
    premiumBadge: "Premium",
    newBadge: "Baru",
  },
};

type Dictionary = typeof id;

const en: Dictionary = {
  brand: {
    name: "TEDUHATI",
    tagline: "Growing together, with heart",
  },

  nav: {
    home: "Home",
    activities: "Activities",
    stories: "Stories",
    garden: "Growth",
  },

  greeting: {
    dawn: "Good morning",
    morning: "Good morning",
    afternoon: "Good afternoon",
    evening: "Good evening",
    night: "Good evening",
    noName: "Hello",
  },

  home: {
    todayLabel: "Today's activity",
    todayLead: "One small thing to do together today.",
    start: "Start",
    alsoToday: "Other picks for today",
    bondingLabel: "Bonding moment",
    bondingDone: "We did this",
    bondingDoneAck: "Noted. Thank you for showing up for them.",
    musicLabel: "Music for right now",
    storyLabel: "Bedtime story",
    gardenPeek: "See the Growth Garden",
    addChild: "Add your child",
    addChildLead:
      "Enter your child's birth date and TEDUHATI matches activities to their age.",
    switchChild: "Switch child",
  },

  activity: {
    minutes: "minutes",
    materials: "What you need",
    noMaterials: "Nothing needed",
    goal: "What this builds",
    steps: "Steps",
    stepOf: "Step {current} of {total}",
    next: "Next",
    back: "Back",
    finish: "Finish",
    tip: "Tip for parents",
    safety: "Safety note",
    variations: "Variations",
    done: "Activity finished",
    doneLead: "{child}'s garden grew a little today.",
    howWasIt: "How did they take it?",
    moodLoved: "Loved it",
    moodOkay: "It was fine",
    moodNotToday: "Not today",
    saveAndClose: "Save and close",
    skipRating: "Skip",
    filterTitle: "Filter activities",
    filterDuration: "Time you have",
    filterDomain: "Area",
    filterMaterials: "What's at home",
    filterAny: "Any",
    filterApply: "Apply",
    filterReset: "Clear filters",
    empty: "No activity matches these filters yet. Try widening the time or materials.",
  },

  garden: {
    title: "Growth Garden",
    lead: "Every finished activity grows one bed.",
    disclaimer:
      "This garden is a record of time spent together, not a developmental assessment. For concerns about your child's development, speak to a doctor or health professional.",
    stage: {
      seed: "Seed",
      sprout: "Sprout",
      plant: "Plant",
      flower: "Flower",
      tree: "Tree",
    },
    activityCount: "{count} activities",
    nextStage: "{remaining} more to reach {stage}",
    fullGrown: "Fully grown",
    emptyTitle: "The garden is still bare",
    emptyLead: "Finish one activity and the first bed will sprout.",
    recent: "Last done",
  },

  stories: {
    title: "Stories",
    lead: "Short stories to read together.",
    read: "Read",
    continue: "Continue",
    minutes: "min read",
    interactive: "Interactive",
    empty: "No stories for this age yet. New ones are added every month.",
    nextPage: "Next page",
    finish: "Close story",
  },

  bonding: {
    title: "Bonding",
    lead: "One to three minute moments that fit into an ordinary day.",
    why: "Why this matters",
    types: {
      morning: "Morning",
      play: "While playing",
      meal: "At mealtime",
      bath: "At bathtime",
      outdoor: "Outdoors",
      bedtime: "Before bed",
      anytime: "Anytime",
    },
    markDone: "We did this",
    empty: "Bonding moments for this age are being prepared.",
  },

  music: {
    title: "Music",
    lead: "Four moods, matched to the time and the activity.",
    modes: {
      morning: "Morning",
      play: "Play",
      bonding: "Bonding",
      bedtime: "Bedtime",
    },
    play: "Play",
    pause: "Pause",
    comingSoon: "Track in production",
  },

  ask: {
    title: "Ask TEDUHATI",
    lead: "Describe your situation and we'll adapt an activity to it.",
    placeholder:
      "For example: my 3-year-old loves vehicles, I only have cardboard, and 15 minutes.",
    send: "Send",
    thinking: "Writing an answer",
    disclaimer:
      "These are activity suggestions, not medical advice. For health concerns, contact a health professional.",
    limitReached:
      "You've used this month's free questions. Premium opens unlimited questions.",
    history: "Earlier questions",
    empty: "No questions yet. Write one above to start.",
  },

  child: {
    title: "Child profile",
    name: "Child's name",
    namePlaceholder: "A nickname is fine",
    birthDate: "Birth date",
    birthDateHelp: "Used to work out their age and filter activities.",
    interests: "What they're into",
    interestsHelp: "Optional. Helps us pick the context for activities.",
    save: "Save profile",
    saved: "Profile saved",
    ageMonths: "{count} months",
    ageYears: "{years}y {months}m",
    ageYearsOnly: "{years} years",
    stage: "Stage",
    addAnother: "Add another child",
    limitFree: "The free plan covers one child. Premium covers three.",
    remove: "Remove profile",
    removeConfirm: "Remove {name}'s profile? Their activity history goes with it.",
  },

  auth: {
    signInTitle: "Sign in to TEDUHATI",
    signInLead: "Enter your email and we'll send a sign-in link.",
    email: "Email",
    sendLink: "Send sign-in link",
    linkSent: "Link sent",
    linkSentLead: "Open the email at {email} and click the link to sign in.",
    signOut: "Sign out",
    checkingLink: "Checking your sign-in link",
    linkInvalid: "This link was already used or has expired. Request a new one to sign in.",
    requestAgain: "Request a new link",
  },

  plans: {
    title: "Plans",
    free: "Free",
    premium: "Premium",
    annual: "Annual",
    perMonth: "/month",
    perYear: "/year",
    currentPlan: "Your current plan",
    upgrade: "Choose Premium",
    freeList: [
      "1 child profile",
      "1 activity per day",
      "5 stories per month",
      "5 AI questions per month",
    ],
    premiumList: [
      "3 child profiles",
      "Unlimited activities and stories",
      "Unlimited AI questions",
      "Printable worksheets",
      "The full Growth Garden",
    ],
    lockedTitle: "Premium section",
    lockedLead: "Open this with a Premium plan.",
  },

  common: {
    loading: "Loading",
    retry: "Try again",
    cancel: "Cancel",
    close: "Close",
    save: "Save",
    error: "Something didn't work",
    errorLead: "Reload this page. If it keeps happening, try again in a little while.",
    notFound: "This page doesn't exist",
    notFoundLead: "The link may have changed. Head back home to carry on.",
    backHome: "Go home",
    language: "Language",
    premiumBadge: "Premium",
    newBadge: "New",
  },
};

const DICTIONARIES: Record<Locale, Dictionary> = { id, en };

export function getDictionary(locale: Locale): Dictionary {
  return DICTIONARIES[locale] ?? DICTIONARIES.id;
}

export type { Dictionary };

/** Fills {placeholders} in a dictionary string. */
export function fill(
  template: string,
  values: Record<string, string | number>,
): string {
  return template.replace(/\{(\w+)\}/g, (_, key) =>
    key in values ? String(values[key]) : `{${key}}`,
  );
}
