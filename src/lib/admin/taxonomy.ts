import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import type { Locale } from "@/i18n/config";
import type { Taxonomy } from "@/lib/admin/options";

/**
 * The fixed vocabulary every content form draws on.
 *
 * Domains, age bands, skills and material tags are taxonomy: they come from the
 * database, not from a list typed into a component, so an editor can never tag
 * an activity with a domain the recommender has never heard of.
 *
 * Server-only — it imports the Supabase server client. The enum option lists and
 * the types live in `options.ts` so a client component can reach them without
 * pulling this file into the browser bundle.
 */

export const getTaxonomy = cache(async (locale: Locale): Promise<Taxonomy> => {
  const supabase = await createClient();

  const [bands, bandNames, domains, domainNames, skills, skillNames, materials, materialNames] =
    await Promise.all([
      supabase.from("age_bands").select("code, age_min_months, age_max_months, sort_order"),
      supabase.from("age_band_translations").select("age_band_code, name").eq("locale", locale),
      supabase.from("domains").select("code, sort_order"),
      supabase.from("domain_translations").select("domain_code, name").eq("locale", locale),
      supabase.from("skills").select("code, domain_code, sort_order"),
      supabase.from("skill_translations").select("skill_code, name").eq("locale", locale),
      supabase.from("material_tags").select("code, sort_order"),
      supabase.from("material_tag_translations").select("material_tag_code, name").eq("locale", locale),
    ]);

  const bandName = new Map((bandNames.data ?? []).map((r) => [r.age_band_code, r.name]));
  const domainName = new Map((domainNames.data ?? []).map((r) => [r.domain_code, r.name]));
  const skillName = new Map((skillNames.data ?? []).map((r) => [r.skill_code, r.name]));
  const materialName = new Map(
    (materialNames.data ?? []).map((r) => [r.material_tag_code, r.name]),
  );

  return {
    ageBands: (bands.data ?? [])
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((b) => ({
        value: b.code,
        label: `${bandName.get(b.code) ?? b.code} (${b.age_min_months}–${b.age_max_months})`,
      })),
    domains: (domains.data ?? [])
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((d) => ({ value: d.code, label: domainName.get(d.code) ?? d.code })),
    skills: (skills.data ?? [])
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((s) => ({
        value: s.code,
        label: skillName.get(s.code) ?? s.code,
        // Grouped by domain, because forty skills in one flat list is unusable.
        group: domainName.get(s.domain_code) ?? s.domain_code,
      })),
    materials: (materials.data ?? [])
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((m) => ({ value: m.code, label: materialName.get(m.code) ?? m.code })),
  };
});
