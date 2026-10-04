# TEDUHATI

Parenting companion untuk anak usia 0–5 tahun.
_Menemani tumbuh dengan penuh hati._

Orang tua memasukkan tanggal lahir anak, dan aplikasi menyesuaikan satu aktivitas
setiap hari dengan usianya. Janji produknya satu kalimat: **tahu apa yang bisa
dilakukan bersama anak, setiap hari.**

---

## Menjalankan di komputer sendiri

```bash
npm install
cp .env.example .env.local     # isi kuncinya, lihat bagian Environment
npm run dev                    # http://localhost:3000
```

Perintah lain:

| Perintah | Fungsi |
|---|---|
| `npm run check` | Validasi konten, typecheck, lint — jalankan sebelum commit |
| `npm run content:check` | Validasi 100 aktivitas, bonding, dan cerita |
| `npm run db:seed` | Dorong seluruh konten dari `content/` ke Supabase |
| `npm run db:types` | Regenerate `src/types/db.ts` dari schema yang hidup |
| `npm run build` | Build produksi |

### Environment

Salin `.env.example` menjadi `.env.local`. `.env.local` sudah di-gitignore;
jangan pernah commit kunci asli.

- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` — aman di browser,
  karena yang melindungi data adalah row level security, bukan kuncinya.
- `SUPABASE_SERVICE_ROLE_KEY` — **menembus RLS**. Server-only. Dibutuhkan untuk
  `npm run db:seed` dan untuk webhook pembayaran. Jangan pernah memakai awalan
  `NEXT_PUBLIC_`.
- `AI_*` — kosongkan dan fitur "Tanya TEDUHATI" akan mengatakan belum tersambung,
  bukan gagal diam-diam.

---

## Isi konten

Konten hidup di `content/` sebagai JSON dwibahasa, bukan di dalam kode.

```
content/
├── activities/        100 aktivitas, satu file per age band
├── bonding/           24 momen bonding
└── stories/           6 cerita, sebagian interaktif
```

Setiap kali konten berubah:

```bash
npm run content:check   # wajib lolos
npm run db:seed         # upsert, jadi aman dijalankan berulang
```

`validate-content.mjs` menolak konten sebelum sampai ke orang tua jika: id
duplikat atau salah format, rentang usia keluar dari age band-nya, kode domain
atau skill tidak dikenal, salah satu bahasa hilang, jumlah langkah berbeda antar
bahasa, atau **catatan keamanan kosong pada aktivitas yang memakai bahan atau
untuk bayi di bawah 12 bulan**. Aturan terakhir itu yang paling penting.

### Status konten saat ini

| | Jumlah | Catatan |
|---|---|---|
| Aktivitas | 100 | 9 age band, 10 domain, 17 premium |
| Momen bonding | 24 | Modul tersendiri, bukan jenis aktivitas |
| Cerita | 6 | 3 di antaranya interaktif |
| Track musik | 10 | Metadata saja; file audio belum diproduksi |
| SFX | 12 + 1 signature | Metadata saja |

Target kurikulum adalah ±500 aktivitas. 100 ini adalah pilot yang disebut di
roadmap, bukan angka akhir.

---

## Arsitektur

**Next.js 16 (App Router) · React 19 · Tailwind 4 · Supabase · PWA**

```
src/
├── app/[locale]/      semua halaman hidup di bawah segmen bahasa
├── components/        satu file untuk seluruh kit UI, plus Tumi dan Kebun
├── i18n/              kamus ID dan EN untuk teks antarmuka
├── lib/               query, server action, usia, entitlement, provider AI
├── types/db.ts        tipe database
└── proxy.ts           locale + sesi + penjaga halaman
supabase/migrations/   schema, RLS, function — urut dan bisa dijalankan ulang
```

### Prinsip yang menentukan bentuknya

**Database-first.** AI tidak pernah mengarang kurikulum. `recommend_activities`
memilih kandidat dari database, lalu model hanya menyesuaikan bahasanya dengan
situasi keluarga. Lebih aman, lebih murah, dan konsisten.

**Teks tidak pernah ada di tabel induk.** Setiap tabel konten punya pasangan
`*_translations`. Menambah bahasa ketiga berarti menambah baris, bukan mengubah
schema.

**Pipeline rekomendasi ada di Postgres, bukan di aplikasi.**
`usia → domain → durasi → bahan → keamanan → peringkat`, semuanya berjalan di
atas index dalam satu panggilan. Peringkatnya menaikkan domain yang jarang
disentuh, menurunkan aktivitas yang sudah dilakukan, dan memakai hash harian
supaya "hari ini" berarti hal yang sama sepanjang hari.

**RLS yang menjaga data, bukan kode aplikasi.** Orang tua hanya melihat anaknya
sendiri. Konten premium tersembunyi di tiga lapis: baris aktivitas, baris
terjemahannya, dan fungsi rekomendasi. Sudah diuji dari sisi anon, orang tua
pemilik, dan orang tua lain.

**Kebun Tumbuh punya enam petak, bukan sepuluh.** Domain akademik melipat ke
petak asalnya lewat kolom `domains.garden_domain`: literasi ke Bahasa, numerasi
dan kesiapan sekolah ke Berpikir, kemandirian ke Sosial & Emosi.

---

## Desain

Lihat `/id/pratinjau` saat `npm run dev` berjalan: seluruh token, state Tumi,
tahapan kebun, dan komponen dalam satu halaman. Halaman itu tidak ikut ke
produksi.

- **Palet** dikunci oleh brand book: Cream `#F8F4EA`, Sage `#6F8F78`,
  Soft Yellow `#E9C96A`, Terracotta `#B86F55`, Dusty Blue `#8CA7B8`.
- **Tipografi**: Plus Jakarta Sans, satu family, di-self-host lewat
  `@fontsource-variable`. Tidak ada permintaan ke pihak ketiga, dan PWA yang
  sudah terpasang tetap tampil benar tanpa koneksi.
- **Radius menandai hierarki.** Radius "daun" (besar di dua sudut berseberangan)
  hanya dipakai pada satu kartu utama per layar dan pada petak kebun. Pil untuk
  tombol. Radius biasa untuk sisanya.
- **Gerak menjawab ketukan.** Hanya Tumi yang punya animasi berjalan sendiri.
  `prefers-reduced-motion` dihormati.

Tumi di repo ini adalah SVG inline buatan sendiri, bukan aset final. Ia dirancang
untuk digantikan oleh karakter Rive tanpa mengubah tata letak.

---

## Yang belum ada

Jujur tentang batasnya, supaya tidak ada kejutan:

- **File audio belum ada.** Katalog musik dan SFX sudah di database lengkap
  dengan BPM dan instrumen, tapi `license_note` setiap baris masih bertuliskan
  `PENDING`. **Pastikan hak komersial sebelum rilis berbayar.**
- **Pembayaran belum tersambung.** Halaman paket menampilkan harga dan
  mengatakan checkout belum dibuka, bukan tombol yang tidak ke mana-mana.
  Tabel `subscriptions` dan `usage_counters` sudah siap menerima webhook.
- **Cerita belum punya layar baca.** Daftar cerita sudah jalan; pembaca halaman
  per halaman dan percabangan interaktif belum dibuat.
- **Worksheet** baru ada tabelnya, belum ada filenya.
- **Ilustrasi aktivitas** merujuk ke `activities/ACT-XXXX.webp` yang belum
  diproduksi. Aplikasi tidak rusak tanpanya.

---

## Keamanan anak

Ini bagian yang tidak boleh dikompromikan.

- Aplikasi **bukan alat diagnosis**. Kebun Tumbuh adalah catatan kebersamaan, dan
  kalimat itu muncul di layar Kebun dan di setiap aktivitas.
- Setiap aktivitas dengan bahan, dan setiap aktivitas untuk bayi di bawah 12
  bulan, **wajib** punya catatan keamanan. Validator menolak build tanpanya.
- Konten menghindari benda kecil, air tanpa pengawasan, dan instruksi yang
  membuat anak ditinggal sendiri.
- Untuk kekhawatiran kesehatan atau tumbuh kembang, aplikasi mengarahkan ke
  tenaga kesehatan, termasuk di prompt sistem AI.

> Dokumen kurikulum ini blueprint produk, bukan pengganti evaluasi ahli.
> **Sebelum peluncuran komersial, konten — terutama untuk bayi — perlu ditinjau
> oleh dokter anak, psikolog, atau pendidik PAUD yang kompeten.**

## Kepemilikan konten

Framework pihak ketiga (WHO Nurturing Care, CDC, kurikulum PAUD) dipakai sebagai
rujukan, dan dicatat di kolom `source_reference`. Seluruh teks aktivitas, cerita,
dan momen bonding di repo ini ditulis original untuk TEDUHATI.
