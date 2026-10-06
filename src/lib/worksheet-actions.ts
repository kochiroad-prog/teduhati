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

/* -------------------------------------------------------------------------- */
/* bulk                                                                       */
/* -------------------------------------------------------------------------- */
/**
 * Edits many worksheets at once.
 *
 * With a thousand sheets arriving from one folder, tagging them one at a time
 * is not a workflow. Only the fields actually given are written, so "set the
 * domain on these forty" cannot quietly reset their age ranges.
 */
export async function bulkUpdateWorksheets(form: FormData): Promise<AdminResult> {
  const supabase = await createClient();
  const locale = loc(form.get("locale"));
  const ids = form.getAll("ids").map(String).filter(Boolean);

  if (ids.length === 0) {
    return {
      ok: false,
      message: locale === "en" ? "Nothing selected." : "Belum ada yang dipilih.",
    };
  }

  const domain = String(form.get("domain") ?? "").trim() || null;
  const ageMinRaw = String(form.get("age_min_months") ?? "").trim();
  const ageMaxRaw = String(form.get("age_max_months") ?? "").trim();
  const premiumRaw = String(form.get("is_premium") ?? "");

  const ageMin = ageMinRaw === "" ? null : Number.parseInt(ageMinRaw, 10);
  const ageMax = ageMaxRaw === "" ? null : Number.parseInt(ageMaxRaw, 10);
  const premium = premiumRaw === "" ? null : premiumRaw === "true";

  if (domain === null && ageMin === null && ageMax === null && premium === null) {
    return {
      ok: false,
      message:
        locale === "en"
          ? "Nothing to change — fill in at least one field."
          : "Tidak ada yang diubah — isi minimal satu kolom.",
    };
  }

  const { data, error } = await supabase.rpc("admin_bulk_update_worksheets", {
    p_ids: ids,
    p_domain: domain,
    p_age_min: ageMin,
    p_age_max: ageMax,
    p_is_premium: premium,
  });

  if (error) return { ok: false, message: error.message };

  revalidatePath(`/${locale}/admin`, "layout");
  return {
    ok: true,
    message:
      locale === "en" ? `${data ?? 0} updated.` : `${data ?? 0} baris diperbarui.`,
  };
}

/**
 * Publishes or withdraws many at once, one `set_content_status` call each.
 *
 * Deliberately not a single UPDATE: that function is where the validation and
 * the audit entry live, and a bulk path that skipped them would be a way to put
 * a worksheet with no file in front of a parent. The sheets that cannot be
 * published are reported by name rather than silently dropped.
 */
export async function bulkSetWorksheetStatus(form: FormData): Promise<AdminResult> {
  const supabase = await createClient();
  const locale = loc(form.get("locale"));
  const ids = form.getAll("ids").map(String).filter(Boolean);
  const status = String(form.get("status") ?? "");

  if (!["draft", "review", "published", "retired"].includes(status)) {
    return { ok: false, message: "Unknown status." };
  }
  if (ids.length === 0) {
    return {
      ok: false,
      message: locale === "en" ? "Nothing selected." : "Belum ada yang dipilih.",
    };
  }
  if (ids.length > 200) {
    return {
      ok: false,
      message:
        locale === "en"
          ? "Too many at once — 200 is the limit."
          : "Terlalu banyak sekaligus — batasnya 200.",
    };
  }

  const refused: string[] = [];
  let done = 0;

  for (const id of ids) {
    const { data, error } = await supabase.rpc("set_content_status", {
      p_table: "worksheets",
      p_id: id,
      p_status: status as "draft" | "review" | "published" | "retired",
    });
    if (error) {
      refused.push(`${id}: ${error.message}`);
      continue;
    }
    const problems = (data ?? []) as string[];
    if (problems.length > 0) refused.push(`${id}: ${problems.join("; ")}`);
    else done += 1;
  }

  revalidatePath(`/${locale}/admin`, "layout");

  if (refused.length > 0) {
    return {
      ok: false,
      message:
        locale === "en"
          ? `${done} done, ${refused.length} refused.`
          : `${done} berhasil, ${refused.length} ditolak.`,
      problems: refused.slice(0, 20),
    };
  }

  return {
    ok: true,
    message: locale === "en" ? `${done} done.` : `${done} selesai.`,
  };
}
