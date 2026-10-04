"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { href, isLocale, type Locale } from "@/i18n/config";
import {
  orderReference,
  planAmount,
  uniqueSuffix,
  type PaidPlan,
} from "@/lib/payments";
import type { ActionResult } from "@/lib/actions";

function locale(value: FormDataEntryValue | null): Locale {
  const v = typeof value === "string" ? value : "id";
  return isLocale(v) ? v : "id";
}

/**
 * Starts a checkout.
 *
 * Creates one order row and sends the parent to the payment screen. The order is
 * only a request to pay: nothing about the subscription changes until an admin
 * confirms it with `approve_order`.
 */
export async function startCheckout(formData: FormData): Promise<ActionResult> {
  const supabase = await createClient();
  const loc = locale(formData.get("locale"));

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(href(loc, "signIn"));

  const planRaw = String(formData.get("plan") ?? "");
  if (planRaw !== "premium" && planRaw !== "annual") {
    return { ok: false, message: loc === "en" ? "Choose a plan first." : "Pilih paketnya dulu." };
  }
  const plan = planRaw as PaidPlan;

  // An unfinished order for the same plan is reused, so refreshing the page
  // doesn't leave a trail of abandoned orders with different amounts.
  const { data: open } = await supabase
    .from("orders")
    .select("id, plan, status, expires_at")
    .eq("user_id", user.id)
    .eq("plan", plan)
    .in("status", ["awaiting_payment", "awaiting_confirmation"])
    .gt("expires_at", new Date().toISOString())
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (open) redirect(`${href(loc, "pay")}/${open.id}`);

  const amount = planAmount(plan);
  const suffix = uniqueSuffix();

  const { data: order, error } = await supabase
    .from("orders")
    .insert({
      user_id: user.id,
      reference: orderReference(),
      plan,
      amount,
      unique_suffix: suffix,
      total: amount + suffix,
      provider: "manual_transfer",
    })
    .select("id")
    .single();

  if (error || !order) {
    return { ok: false, message: error?.message ?? "Order could not be created." };
  }

  redirect(`${href(loc, "pay")}/${order.id}`);
}

/** The parent says they have transferred; this moves the order into the admin queue. */
export async function confirmTransfer(formData: FormData): Promise<ActionResult> {
  const supabase = await createClient();
  const loc = locale(formData.get("locale"));
  const orderId = String(formData.get("order_id") ?? "");
  const note = String(formData.get("payer_note") ?? "").trim().slice(0, 300);

  const { error } = await supabase
    .from("orders")
    .update({ status: "awaiting_confirmation", payer_note: note || null })
    .eq("id", orderId)
    .eq("status", "awaiting_payment");

  if (error) return { ok: false, message: error.message };

  revalidatePath(`/${loc}`, "layout");
  return { ok: true };
}

/* -------------------------------------------------------------------------- */
/* admin                                                                      */
/* -------------------------------------------------------------------------- */

export async function approveOrder(formData: FormData): Promise<ActionResult> {
  const supabase = await createClient();
  const loc = locale(formData.get("locale"));
  const orderId = String(formData.get("order_id") ?? "");
  const note = String(formData.get("note") ?? "").trim() || undefined;

  const { error } = await supabase.rpc("approve_order", {
    p_order_id: orderId,
    p_note: note,
  });

  if (error) return { ok: false, message: error.message };

  revalidatePath(`/${loc}/admin`, "layout");
  return { ok: true };
}

export async function rejectOrder(formData: FormData): Promise<ActionResult> {
  const supabase = await createClient();
  const loc = locale(formData.get("locale"));
  const orderId = String(formData.get("order_id") ?? "");
  const note = String(formData.get("note") ?? "").trim() || undefined;

  const { error } = await supabase.rpc("reject_order", {
    p_order_id: orderId,
    p_note: note,
  });

  if (error) return { ok: false, message: error.message };

  revalidatePath(`/${loc}/admin`, "layout");
  return { ok: true };
}
