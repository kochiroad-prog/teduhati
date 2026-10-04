# Dokumen sumber

Dokumen perencanaan asli, disimpan apa adanya sebagai catatan dari mana produk ini
berasal. Semuanya masih memakai nama lama, **Teman Tumbuh**.

| Dokumen | Isi |
|---|---|
| `Master_Curriculum_Teman_Tumbuh_0-5_Tahun.pdf` | Taxonomy usia, domain, skill, schema aktivitas, target ±500 aktivitas |
| `Rencana_Bisnis_Teman_Tumbuh_0-5_Tahun.pdf` | MVP, tabel Supabase, paket harga, roadmap, target validasi |
| `Rencana_Visual_dan_Musik_Teman_Tumbuh.pdf` | Arah visual, Home, maskot, Kebun Tumbuh, sistem musik dan sound |
| `Teman_Tumbuh_Pipeline_Generate_Visual_Musik.md` | Pipeline produksi aset visual dan audio |

## Yang berubah saat menjadi TEDUHATI

| Hal | Dokumen lama | Sekarang |
|---|---|---|
| Nama | Teman Tumbuh | TEDUHATI |
| Tagline | Tumbuh bersama, setiap hari | Menemani tumbuh dengan penuh hati |
| Target aktivitas | 300 (bisnis) / ±500 (kurikulum) | ±500, dengan 100 pilot sudah ditulis |
| Bonding | Bagian dari aktivitas | Modul tersendiri, punya tabel dan layar sendiri |
| Musik | Hanya musik | Katalog musik dan SFX, keduanya di database |

Satu hal yang perlu dicatat: tabel `activities` di PDF rencana bisnis terpotong di
kolom `image_`. Schema yang dipakai sekarang mengambil daftar field lengkapnya
dari Master Curriculum, lalu menambahkan field yang dibutuhkan pipeline
rekomendasi (`materials`, `no_materials`, `age_band_code`, `bonding_level`,
`music_mode`, `status`).

Dokumen di folder ini tidak diperbarui. Rujukan yang hidup adalah `README.md`
di akar repo.
