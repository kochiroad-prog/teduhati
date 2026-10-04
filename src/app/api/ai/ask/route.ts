import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { entitlementsWith, withinLimit } from "@/lib/entitlements";
import { getSettings } from "@/lib/settings";
import { aiConfigured, ask } from "@/lib/ai/provider";
import { ageInMonths, resolveAgeBand } from "@/lib/age";
import type { PlanTier, RecommendedActivity } from "@/types/db";

/**
 * Ask TEDUHATI.
 *
 * Order matters: check the session, count the question against the plan's
 * monthly limit, fetch candidate activities from the database, and only then
 * call the model. The counter is bumped before the model runs so a failed
 * provider call can't be retried for free in a loop.
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  let body: { question?: unknown; childId?: unknown; locale?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  const question = typeof body.question === "string" ? body.question.trim() : "";
  const childId = typeof body.childId === "string" ? body.childId : "";
  const locale = typeof body.locale === "string" && isLocale(body.locale) ? body.locale : "id";
  const dict = getDictionary(locale);

  if (question.length < 3 || question.length > 1000) {
    return NextResponse.json({ error: "invalid_question" }, { status: 400 });
  }

  if (!aiConfigured()) {
    return NextResponse.json({ error: "ai_not_configured" }, { status: 503 });
  }

  const { data: child } = await supabase
    .from("children")
    .select("id, name, birth_date")
    .eq("id", childId)
    .maybeSingle();

  if (!child) {
    return NextResponse.json({ error: "child_not_found" }, { status: 404 });
  }

  const { data: planData } = await supabase.rpc("current_plan");
  const plan = ((planData as PlanTier | null) ?? "free") satisfies PlanTier;
  const settings = await getSettings();
  const limit = entitlementsWith(plan, settings.free).aiQuestionsPerMonth;

  const { data: used, error: bumpError } = await supabase.rpc("bump_usage", {
    p_field: "ai_questions",
    p_delta: 1,
  });

  if (bumpError) {
    return NextResponse.json({ error: "usage_failed" }, { status: 500 });
  }

  // bump_usage returns the value after the bump, so this question is the Nth.
  if (!withinLimit((used as number) - 1, limit)) {
    return NextResponse.json(
      { error: "limit_reached", message: dict.ask.limitReached },
      { status: 402 },
    );
  }

  const months = ageInMonths(child.birth_date);

  const { data: candidates } = await supabase.rpc("recommend_activities", {
    p_child_id: child.id,
    p_locale: locale,
    p_limit: 8,
  });

  const list = ((candidates as RecommendedActivity[] | null) ?? []).map((c) => ({
    id: c.activity_id,
    title: c.title,
    summary: c.summary,
    durationMinutes: c.duration_minutes,
    domain: c.domain_name,
  }));

  if (list.length === 0) {
    return NextResponse.json({ error: "no_candidates" }, { status: 409 });
  }

  const { data: band } = await supabase
    .from("age_band_translations")
    .select("stage_name")
    .eq("age_band_code", resolveAgeBand(months))
    .eq("locale", locale)
    .maybeSingle();

  try {
    const result = await ask({
      question,
      locale,
      childName: child.name,
      ageMonths: months,
      stageName: band?.stage_name ?? null,
      candidates: list,
    });

    await supabase.from("ai_conversations").insert({
      user_id: user.id,
      child_id: child.id,
      question,
      answer: result.answer,
      locale,
      provider: result.provider,
      model: result.model,
      input_tokens: result.inputTokens,
      output_tokens: result.outputTokens,
    });

    return NextResponse.json({ answer: result.answer });
  } catch (error) {
    console.error("ai ask failed", error);
    return NextResponse.json({ error: "provider_failed" }, { status: 502 });
  }
}
