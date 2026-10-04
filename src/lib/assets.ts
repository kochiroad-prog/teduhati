/**
 * Illustration assets.
 *
 * Extracted from the brand sticker sheet in `aset app/landing page/`, a single
 * transparent PNG holding every sticker. Each entry is one sticker cropped out
 * and trimmed to its own artwork, so they drop onto any background.
 *
 * The width and height are the real pixel dimensions, handed to next/image so it
 * reserves space and nothing shifts while loading. Nothing here is wider than
 * about 520px, so none of it should be stretched full-bleed on a desktop screen.
 */

export type Asset = { src: string; width: number; height: number; alt: string };

const a = (src: string, width: number, height: number, alt: string): Asset => ({
  src,
  width,
  height,
  alt,
});

/** Tumi, the mascot. Three poses, matching the brand sheet. */
export const TUMI = {
  happy: a("/assets/brand/tumi_happy.png", 252, 344, "Tumi tersenyum"),
  love: a("/assets/brand/tumi_love.png", 225, 327, "Tumi memeluk hati"),
  reading: a("/assets/brand/tumi_reading.png", 275, 337, "Tumi membaca buku"),
} as const;

export type TumiPose = keyof typeof TUMI;

/** The five product pillars, in the order the landing page shows them. */
export const PILLARS = {
  aktivitas: a("/assets/icons/icon_aktivitas.png", 98, 107, ""),
  cerita: a("/assets/icons/icon_cerita.png", 126, 98, ""),
  musik: a("/assets/icons/icon_musik.png", 107, 112, ""),
  ai: a("/assets/icons/icon_ai.png", 121, 105, ""),
  perjalanan: a("/assets/icons/icon_perjalanan.png", 112, 109, ""),
} as const;

export type PillarKey = keyof typeof PILLARS;

export const SCENES = {
  heroFamily: a("/assets/scenes/hero_family.png", 524, 417, "Ibu bermain balok bersama anak dan Tumi"),
  phoneUi: a("/assets/scenes/phone_ui.png", 192, 276, "Layar beranda TEDUHATI"),
  activityCard: a("/assets/scenes/activity_card.png", 240, 235, "Kartu aktivitas Kain Rahasia"),
  story: a("/assets/scenes/story_scene.png", 252, 225, "Tumi membacakan cerita untuk anak"),
  bedtime: a("/assets/scenes/bedtime_scene.png", 264, 225, "Anak tertidur bersama Tumi"),
  growth: a("/assets/scenes/growth_journey.png", 439, 182, "Kebun tumbuh dari tunas sampai pohon"),
} as const;

export const AGES = {
  baby: a("/assets/ages/age_baby.png", 175, 152, "Bayi tengkurap"),
  toddler: a("/assets/ages/age_toddler.png", 130, 155, "Batita dengan boneka"),
  preschool: a("/assets/ages/age_preschool.png", 179, 156, "Anak bermain balok"),
  older: a("/assets/ages/age_older.png", 173, 137, "Anak siap sekolah"),
} as const;

export const DECOR = {
  leafA: a("/assets/decor/leaf_a.png", 150, 176, ""),
  leafB: a("/assets/decor/leaf_b.png", 153, 185, ""),
  cloud: a("/assets/decor/cloud.png", 157, 91, ""),
  butterfly: a("/assets/decor/butterfly.png", 93, 92, ""),
  sun: a("/assets/decor/sun.png", 195, 172, ""),
  plantPot: a("/assets/decor/plant_pot.png", 145, 151, ""),
  childHappy: a("/assets/decor/child_happy.png", 252, 308, "Anak melompat gembira"),
} as const;
