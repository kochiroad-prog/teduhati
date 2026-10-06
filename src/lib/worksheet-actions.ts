"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { isLocale, type Locale } from "@/i18n/config";
import type { AdminResult } from "@/lib/admin-actions";

/**
 * Worksheets.
 *
 * The download is the only place in the product where a file is handed over in
 * exchange for a subscription, so the order of operations matters: Postgres is
 * asked whether this caller may have it, and only then is a signed URL minted.
 *
 * A signed URL bypasses row level security by design — that is what makes it
 * useful for a private bucket, and exactly why the permission question cannot be
 * asked after the URL exists. `worksheet_path_for_download` raises if the answer
 * is no, so there is no path where a URL is produced for someone who should not
 * have one.
 */

const SIGNED_URL_SECONDS = 120;

function loc(value: FormDataEntryValue | null): Locale {
  const v = typeof value === "string" ? value : "id";
  return isLocale(v) ? v : "id";
}

export type DownloadResult =
  | { ok: true; url: string }
  | { ok: false; message: string };

export async function worksheetDownloadUrl(
  id: string,
  locale: Locale,
): Promise<DownloadResult> {
  const supabase = await createClient();

  const { data: path, error } = await supabase.rpc("worksheet_path_for_download", {
    p_id: id,
  });

  if (error || !path) {
    // The database's own message names the reason — not switched on, not
    // published, Premium only — so it is translated here rather than replaced
    // with something vaguer.
    const raw = error?.message ?? "";
    const message = raw.includes("Premium")
      ? locale === "en"
        ? "This worksheet is part of Premium."
        : "Lembar kerja ini bagian dari Premium."
      : raw.includes("not switched on")
        ? locale === "en"
          ? "Worksheets aren't switched on yet."
          : "Lembar kerja belum diaktifkan."
        : locale === "en"
          ? "That worksheet isn't available."
          : "Lembar kerja itu tidak tersedia.";
    return { ok: false, message };
  }

  // Short-lived on purpose. Long enough to start a download, too short to be
  // worth pasting into a group chat.
  const { data, error: signError } = await supabase.storage
    .from("worksheets")
    .createSignedUrl(path, SIGNED_URL_SECONDS, { download: true });

  if (signError || !data?.signedUrl) {
    return {
      ok: false,
      message: signError?.message ?? "Could not prepare the download.",
    };
  }

  return { ok: true, url: data.signedUrl };
}

/* -------------------------------------------------------------------------- */
/* admin                                                                      */
/* -------------------------------------------------------------------------- */
export async function saveWorksheet(form: FormData): Promise<AdminResult> {
  const supabase = await createClient();
  const locale = loc(form.get("locale"));
  const id = String(form.get("id") ?? "");

  if (!/^WRK-\d{4}$/.test(id)) {
    return { ok: false, message: `"${id}" is not a worksheet id.` };
  }

  const ageMin = Number.parseInt(String(form.get("age_min_months") ?? ""), 10);
  const ageMax = Number.parseInt(String(form.get("age_max_months") ?? ""), 10);

  if (!Number.isFinite(ageMin) || !Number.isFinite(ageMax) || ageMin >= ageMax) {
    return {
      ok: false,
      message:
        locale === "en"
          ? "The minimum age must be below the maximum."
          : "Usia minimum harus di bawah usia maksimum.",
    };
  }
  if (ageMax > 72) {
    return {
      ok: false,
      message:
        locale === "en"
          ? "TEDUHATI covers 0 to 72 months. A sheet outside that is recommended to nobody."
          : "TEDUHATI mencakup 0 sampai 72 bulan. Lembar di luar itu tidak akan direkomendasikan ke siapa pun.",
    };
  }

  const { error } = await supabase
    .from("worksheets")
    .update({
      age_min_months: ageMin,
      age_max_months: ageMax,
      primary_domain: String(form.get("primary_domain") ?? ""),
      page_count: Number.parseInt(String(form.get("page_count") ?? "1"), 10) || 1,
      is_premium: form.get("is_premium") === "on",
      sort_order: Number.parseInt(String(form.get("sort_order") ?? "0"), 10) || 0,
    })
    .eq("id", id);

  if (error) return { ok: false, message: error.message };

  const translations = (["id", "en"] as const).map((l) => ({
    worksheet_id: id,
    locale: l,
    title: String(form.get(`title_${l}`) ?? "").trim().slice(0, 200),
    description: String(form.get(`description_${l}`) ?? "").trim().slice(0, 600),
  }));

  const { error: trError } = await supabase
    .from("worksheet_translations")
    .upsert(translations);
  if (trError) return { ok: false, message: trError.message };

  revalidatePath(`/${locale}/admin`, "layout");
  return { ok: true };
}
