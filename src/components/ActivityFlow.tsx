"use client";

import { useState, useTransition } from "react";
import { Button, Card, Chip, LeafCard, Notice, StepDots } from "@/components/ui";
import { ActivityImage } from "@/components/ActivityImage";
import { Tumi } from "@/components/Tumi";
import { completeActivity } from "@/lib/actions";
import { fill, getDictionary } from "@/i18n/dictionaries";
import type { Locale } from "@/i18n/config";
import type { ActivityStep } from "@/types/db";

/**
 * An activity is a guided experience, not an article.
 *
 * Three phases: brief, then one step at a time, then a close that records how
 * the child took it. Motion only answers a tap — each step grows in when the
 * parent advances, and nothing animates on its own.
 */

type Phase = { kind: "brief" } | { kind: "step"; index: number } | { kind: "done" };

export function ActivityFlow(props: {
  locale: Locale;
  childId: string;
  childName: string;
  activityId: string;
  /** From the illustration ladder; null means the mascot stands in. */
  pictureUrl: string | null;
  durationMinutes: number;
  domainName: string | null;
  colorToken: string | null;
  noMaterials: boolean;
  materialNames: string[];
  materialsText: string | null;
  summary: string;
  learningGoal: string;
  steps: ActivityStep[];
  parentTip: string | null;
  safetyNotes: string | null;
  variations: string[];
}) {
  const dict = getDictionary(props.locale);
  const [phase, setPhase] = useState<Phase>({ kind: "brief" });
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [mood, setMood] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const total = props.steps.length;

  function begin() {
    setStartedAt(Date.now());
    setPhase(total > 0 ? { kind: "step", index: 0 } : { kind: "done" });
  }

  function next() {
    if (phase.kind !== "step") return;
    setPhase(
      phase.index + 1 < total ? { kind: "step", index: phase.index + 1 } : { kind: "done" },
    );
  }

  function back() {
    if (phase.kind !== "step") return;
    setPhase(phase.index === 0 ? { kind: "brief" } : { kind: "step", index: phase.index - 1 });
  }

  function finish() {
    const data = new FormData();
    data.set("child_id", props.childId);
    data.set("activity_id", props.activityId);
    data.set("locale", props.locale);
    if (mood) data.set("mood", mood);
    if (startedAt) {
      data.set("actual_minutes", String(Math.max(1, Math.round((Date.now() - startedAt) / 60000))));
    }

    startTransition(async () => {
      const result = await completeActivity(data);
      if (result && !result.ok) setError(result.message);
    });
  }

  /* ---------------------------------------------------------------- brief */
  if (phase.kind === "brief") {
    return (
      <div className="space-y-5">
        <LeafCard>
          <div className="flex items-start justify-between gap-4">
            <p className="text-body max-w-[38ch]">{props.summary}</p>
            <ActivityImage src={props.pictureUrl} alt="" size={96} priority />
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <Chip colorToken="sage">
              {props.durationMinutes} {dict.activity.minutes}
            </Chip>
            {props.domainName ? (
              <Chip colorToken={props.colorToken}>{props.domainName}</Chip>
            ) : null}
          </div>
        </LeafCard>

        <Card>
          <p className="text-meta text-ink-faint">{dict.activity.goal}</p>
          <p className="text-small mt-1.5">{props.learningGoal}</p>
        </Card>

        <Card>
          <p className="text-meta text-ink-faint">{dict.activity.materials}</p>
          <p className="text-small mt-1.5">
            {props.noMaterials
              ? dict.activity.noMaterials
              : props.materialsText ?? props.materialNames.join(", ")}
          </p>
        </Card>

        {props.safetyNotes ? (
          <Notice tone="care" title={dict.activity.safety}>
            {props.safetyNotes}
          </Notice>
        ) : null}

        <Button size="lg" onClick={begin} className="w-full">
          {dict.home.start}
        </Button>
      </div>
    );
  }

  /* ----------------------------------------------------------------- step */
  if (phase.kind === "step") {
    const step = props.steps[phase.index];
    return (
      <div className="space-y-5">
        <div className="flex items-center justify-between gap-4">
          <StepDots total={total} current={phase.index} />
          <p className="text-meta text-ink-faint">
            {fill(dict.activity.stepOf, { current: phase.index + 1, total })}
          </p>
        </div>

        <LeafCard key={phase.index} className="animate-grow-in">
          <h2 className="text-title text-balance">{step.title}</h2>
          <p className="text-body mt-3 max-w-[42ch]">{step.body}</p>
        </LeafCard>

        <div className="flex gap-3">
          <Button tone="secondary" onClick={back} className="flex-1">
            {dict.activity.back}
          </Button>
          <Button onClick={next} className="flex-[2]">
            {phase.index + 1 < total ? dict.activity.next : dict.activity.finish}
          </Button>
        </div>

        {props.parentTip ? (
          <Notice title={dict.activity.tip}>{props.parentTip}</Notice>
        ) : null}
      </div>
    );
  }

  /* ----------------------------------------------------------------- done */
  return (
    <div className="space-y-6">
      <div className="pt-2 text-center">
        <Tumi state="celebrate" size={120} className="mx-auto animate-grow-in" />
        <h2 className="text-title mt-4">{dict.activity.done}</h2>
        <p className="text-small mt-1 text-ink-muted">
          {fill(dict.activity.doneLead, { child: props.childName })}
        </p>
      </div>

      <Card>
        <p className="text-meta text-ink-faint">{dict.activity.howWasIt}</p>
        <div className="mt-3 grid grid-cols-3 gap-2">
          {(
            [
              ["loved_it", dict.activity.moodLoved],
              ["okay", dict.activity.moodOkay],
              ["not_today", dict.activity.moodNotToday],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => setMood(value)}
              aria-pressed={mood === value}
              className={
                mood === value
                  ? "rounded-[14px] border border-sage bg-sage px-2 py-3 text-[0.8125rem] font-semibold text-white"
                  : "rounded-[14px] border border-line bg-white px-2 py-3 text-[0.8125rem] font-semibold text-ink-muted hover:border-sage"
              }
            >
              {label}
            </button>
          ))}
        </div>
      </Card>

      {props.variations.length > 0 ? (
        <Card>
          <p className="text-meta text-ink-faint">{dict.activity.variations}</p>
          <ul className="mt-2 space-y-1.5">
            {props.variations.map((v, i) => (
              <li key={i} className="text-small text-ink-muted">
                {v}
              </li>
            ))}
          </ul>
        </Card>
      ) : null}

      {error ? <p className="text-small text-terracotta">{error}</p> : null}

      <Button size="lg" onClick={finish} disabled={pending} className="w-full">
        {pending ? dict.common.loading : dict.activity.saveAndClose}
      </Button>
    </div>
  );
}
