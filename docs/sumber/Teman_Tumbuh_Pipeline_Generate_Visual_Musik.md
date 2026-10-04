# TEMAN TUMBUH — Pipeline Generate Visual & Musik

## Tujuan

Dokumen ini menjadi blueprint produksi aset visual, animasi, musik, dan sound untuk aplikasi **Teman Tumbuh**, parenting companion untuk anak usia 0–5 tahun.

Prinsip utama:

> Jangan membuat ratusan aset secara manual satu per satu. Bangun **Visual DNA + Asset Library + Audio Library + sistem rendering** sehingga aset dapat digunakan kembali.

---

# 1. Visual DNA

## Arah visual

**Calm + Warm + Playful + Premium**

Teman Tumbuh sebaiknya tidak terlihat seperti:
- aplikasi sekolah
- game anak yang terlalu ramai
- dashboard kesehatan
- aplikasi dengan rainbow color berlebihan

Target rasa:

> Premium untuk orang tua, menyenangkan untuk anak.

## Palet awal

- Warm White / Cream — `#F8F4EA`
- Sage Green — `#6F8F78`
- Soft Yellow — `#E9C96A`
- Terracotta — `#B86F55`
- Dusty Blue — `#8CA7B8`

Gunakan maksimal 3–4 warna dominan dalam satu layar.

---

# 2. Karakter Utama — Tumi

Buat **master character** terlebih dahulu sebelum membuat aktivitas.

## Character Bible

Tumi harus memiliki:
- bentuk tubuh konsisten
- wajah konsisten
- proporsi konsisten
- warna konsisten
- lighting konsisten
- gaya material konsisten

## Expression sheet

Minimal:
- happy
- sleepy
- surprised
- excited
- thinking
- celebrating

## Pose sheet

Minimal:
- standing
- sitting
- waving
- reading
- playing
- sleeping
- pointing
- hugging

## Master character sheet

Buat satu gambar referensi yang berisi:
- front
- side
- back
- expression
- pose
- ukuran relatif

Master ini menjadi referensi setiap generasi berikutnya.

---

# 3. Gaya Visual yang Disarankan

Arah awal:

**Soft-clay / paper-toy 3D**

Karakteristik:
- rounded organic shapes
- tactile clay texture
- soft studio lighting
- warm cream background
- muted colors
- minimal composition
- friendly but sophisticated
- no text
- no watermark

Tujuan utamanya adalah membuat aset terasa konsisten dan mudah dipakai di UI.

---

# 4. Asset Library

Jangan generate setiap halaman sebagai satu gambar utuh.

Pisahkan menjadi:

```text
/assets
├── characters
│   └── tumi
│       ├── idle
│       ├── happy
│       ├── sleepy
│       ├── excited
│       └── celebrate
│
├── activities
│   ├── sensory
│   ├── motor
│   ├── language
│   ├── cognitive
│   └── creativity
│
├── stories
│   ├── story-001
│   ├── story-002
│   └── ...
│
├── backgrounds
├── icons
├── music
│   ├── morning
│   ├── play
│   ├── bonding
│   └── bedtime
└── sfx
```

Keuntungan:
- aset bisa digunakan berulang
- ukuran aplikasi lebih terkontrol
- UI dapat responsive
- visual lebih konsisten
- produksi 500 aktivitas lebih cepat

---

# 5. Generate Visual dengan AI

Gunakan AI image generation untuk:
- Tumi
- expression sheet
- activity illustrations
- story scenes
- backgrounds
- object library
- onboarding artwork

Jangan gunakan AI untuk menghasilkan seluruh UI.

AI menghasilkan aset.

Next.js menghasilkan:
- typography
- button
- progress
- card
- navigation
- instruction
- layout

---

# 6. Master Prompt Visual

Template:

```text
A premium soft-clay 3D children's illustration for a modern parenting app,
warm cream background, muted sage green and terracotta accents,
rounded organic shapes, soft studio lighting, tactile clay texture,
minimal composition, friendly but sophisticated,
clean silhouette, consistent character proportions,
no text, no watermark.
```

Kemudian tambahkan subject.

Contoh:

```text
Tumi holding and exploring a soft blanket,
gentle curious expression,
simple uncluttered composition.
```

Untuk aktivitas lain, ubah subject tanpa mengubah style DNA.

---

# 7. Jangan Generate Teks di Dalam Gambar

AI sering menghasilkan typography yang tidak konsisten.

Karena itu:

**AI:**
- karakter
- objek
- environment
- illustration

**Next.js:**
- title
- description
- button
- price
- progress
- instruction
- labels

Dengan demikian UI tetap tajam, responsive, dan mudah diterjemahkan.

---

# 8. Animasi

Jangan membuat semua animasi sebagai video.

Gunakan:

### Framer Motion
Untuk:
- card transition
- button interaction
- floating
- bounce
- fade
- progress animation

### Rive
Untuk:
- karakter interaktif
- state machine
- Tumi idle
- Tumi wave
- Tumi celebrate
- Tumi sleep

### Lottie
Untuk:
- animasi kecil
- celebration
- loading
- decorative motion

---

# 9. State Tumi

Contoh state:

```text
idle
blink
wave
happy
excited
thinking
celebrate
sleepy
sleep
```

Satu karakter dapat dipakai di ratusan layar.

---

# 10. Musik

Jangan membuat 500 lagu.

Mulai dengan sekitar **8–12 track**.

## Morning
1. Morning Garden
2. Little Sunshine

Mood:
- fresh
- warm
- positive

Instrumen:
- kalimba
- soft piano
- acoustic guitar
- light ambience

Tempo:
**75–90 BPM**

## Play
3. Tiny Adventure
4. Let's Explore
5. Curious Steps

Instrumen:
- marimba
- soft xylophone
- ukulele
- subtle percussion

Tempo:
**90–110 BPM**

## Bonding
6. Together
7. Little Moments

Instrumen:
- piano
- acoustic guitar
- soft strings

Tempo:
**60–80 BPM**

## Bedtime
8. Moonlight
9. Sleepy Cloud
10. Goodnight Tumi

Instrumen:
- felt piano
- music box
- soft pad
- gentle strings

Tempo:
**50–65 BPM**

Tidak menggunakan drum keras atau perubahan dinamika mendadak.

> Untuk produk berbayar, pastikan layanan/generator musik yang digunakan memberikan hak komersial sesuai paket/lisensinya.

---

# 11. Prompt Musik

## Morning

```text
Warm minimal instrumental for a premium parenting app,
gentle kalimba, soft felt piano, subtle acoustic guitar,
peaceful morning atmosphere, playful but sophisticated,
no vocals, no dramatic transitions, seamless 60-second loop.
```

## Play

```text
Gentle playful instrumental for a modern children's parenting app,
soft marimba, subtle ukulele, light percussion,
curious and joyful mood, premium and warm,
no vocals, no aggressive drums, seamless loop.
```

## Bedtime

```text
Extremely gentle bedtime instrumental,
felt piano, soft music box, warm ambient pad,
very slow tempo, peaceful and safe feeling,
minimal melody, no percussion, no vocals,
seamless loop.
```

---

# 12. Sound Effects

Mulai dengan 20–30 SFX.

Contoh:

```text
button_pop.wav
soft_click.wav
complete.wav
success.wav
unlock.wav
level_up.wav
page_flip.wav
tiny_bell.wav
soft_whoosh.wav
sleep_wind.wav
gentle_boop.wav
```

Sound harus terasa lembut, bukan arcade game.

---

# 13. Sonic Branding

Buat signature sound **3 nada** untuk Teman Tumbuh.

Gunakan pada:
- opening
- activity complete
- important unlock
- milestone

Tujuan:

> Pengguna mengenali Teman Tumbuh bahkan sebelum melihat logo.

---

# 14. Asset Data

Contoh database activity:

```json
{
  "activity_id": "ACT-001",
  "title": "Kain Rahasia",
  "age_band": "0-3_months",
  "domain": "sensory",
  "duration_minutes": 7,
  "illustration": "/assets/activities/ACT-001.webp",
  "character_animation": "tumi-happy",
  "completion_sound": "/assets/sfx/complete.wav"
}
```

Dengan cara ini database aktivitas dan asset library terhubung.

---

# 15. AI Recommendation Engine

AI tidak perlu membuat aktivitas baru setiap kali.

Gunakan:

```text
500 curated activities
        ↓
age filter
        ↓
domain filter
        ↓
duration filter
        ↓
materials filter
        ↓
safety filter
        ↓
AI ranking
        ↓
3 recommended activities
```

AI berfungsi sebagai **personalization layer**, bukan sumber utama aktivitas.

Ini lebih aman, lebih murah, dan lebih konsisten.

---

# 16. Pipeline Produksi

```text
                    TEMAN TUMBUH
                          │
                 ┌────────┴────────┐
                 │                 │
              VISUAL              AUDIO
                 │                 │
          ┌──────┴──────┐    ┌─────┴─────┐
          │             │    │           │
        Tumi         Activities Music      SFX
          │             │    │           │
          └──────┬──────┘    └─────┬─────┘
                 │                 │
                 └────────┬────────┘
                          ↓
                    ASSET LIBRARY
                          ↓
                       DATABASE
                          ↓
                       NEXT.JS
                          ↓
                   TEMAN TUMBUH APP
```

---

# 17. Urutan Produksi MVP

Jangan langsung membuat 500 aset.

### Tahap 1 — Character
1. Tumi master character
2. Expression sheet
3. Pose sheet
4. Animation test

### Tahap 2 — Environment
5. 3 background
6. 10 reusable objects

### Tahap 3 — Activity
7. 3 activity illustrations
8. 1 complete activity flow

### Tahap 4 — Story
9. 2 story scenes
10. 1 interactive story

### Tahap 5 — Audio
11. 3 music tracks
12. 10 SFX

### Tahap 6 — Product
13. Home screen
14. Activity screen
15. Story screen
16. Progress / Kebun Tumbuh

### Tahap 7 — Scale
Setelah visual DNA disetujui:
- 500 activities
- story library
- full music library
- complete asset library

---

# 18. Prinsip Utama

1. **Build the style before building the volume.**
2. Gunakan satu master character.
3. Pisahkan asset dari UI.
4. Jangan generate teks di gambar.
5. Gunakan reusable animation.
6. Musik dibuat sedikit tetapi berkualitas.
7. Sound design harus konsisten.
8. AI digunakan untuk produksi dan personalisasi, bukan menggantikan curated curriculum.
9. Review semua aktivitas anak sebelum commercial launch.
10. Pastikan seluruh aset AI memiliki hak penggunaan komersial yang sesuai.

## Target Akhir

Teman Tumbuh harus terasa seperti:

> **🌱 + 👶 + ☀️ + 🌙**

> **“Tumbuh bersama, setiap hari.”**
