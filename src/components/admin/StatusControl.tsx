"use client";

import { useState, useTransition } from "react";
import { Button, Card, Notice } from "@/components/ui";
import { Problems, StatusBadge } from "@/components/admin/parts";
import type { Locale } from "@/i18n/config";
import { adminCopy } from "@/lib/admin/copy";
import { duplicateContent, setContentStatus } from "@/lib/admin-actions";
import type { ContentStatus } from "@/types/db";

/**
 * Publish, unpublish, archive, duplicate.
 *
 * Publishing is the one action in the console that can put something in front
 * of a parent, so it is deliberately separate from saving and it reports back
 * the database's own objections. When `set_content_status` returns a list of
 * problems, those are shown verbatim: they are the reasons the row is not safe
 * to publish, not a generic failure.
 */

export function StatusControl({
  locale,
  table,
  id,
  status,
  canPublish,
  canDuplicate = true,
}: {
  locale: Locale;
  table: "activities" | "stories" | "bonding_moments" | "worksheets";
  id: string;
  status: ContentStatus;
  canPublish: boolean;
  canDuplicate?: boolean;
}) {
  const t = adminCopy(locale);
  const [problems, setProblems] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function change(next: ContentStatus) {
    const data = new FormData();
    data.set("locale", locale);
    data.set("table", table);
    data.set("id", id);
    data.set("status", next);
    start(async () => {
      setProblems([]);
      setError(null);
      const r = await setContentStatus(data);
      if (!r.ok) {
        setProblems(r.problems ?? []);
        if (!r.problems?.length) setError(r.message);
      }
    });
  }

  function duplicate() {
    const data = new FormData();
    data.set("locale", locale);
    data.set("table", table);
    data.set("id", id);
    start(async () => {
      const r = await duplicateContent(data);
      if (!r.ok) setError(r.message);
    });
  }

  return (
    <Card className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="text-meta text-ink-faint">{t.common.status}</span>
          <StatusBadge status={status} locale={locale} />
        </div>
        <span className="text-meta font-mono text-ink-faint">{id}</span>
      </div>

      <Problems problems={problems} title={t.common.problems} />
      {error ? <Notice tone="care">{error}</Notice> : null}

      {canPublish ? (
        <div className="flex flex-wrap gap-2">
          {status !== "published" ? (
            <Button type="button" onClick={() => change("published")} disabled={pending}>
              {t.common.publish}
            </Button>
          ) : (
            <Button
              type="button"
              tone="secondary"
              onClick={() => change("draft")}
              disabled={pending}
            >
              {t.common.unpublish}
            </Button>
          )}

          {status !== "review" && status !== "published" ? (
            <Button
              type="button"
              tone="secondary"
              onClick={() => change("review")}
              disabled={pending}
            >
              {t.status.review}
            </Button>
          ) : null}

          {status !== "retired" ? (
            <Button
              type="button"
              tone="quiet"
              onClick={() => change("retired")}
              disabled={pending}
            >
              {t.common.archive}
            </Button>
          ) : null}

          {canDuplicate ? (
            <Button type="button" tone="quiet" onClick={duplicate} disabled={pending}>
              {t.common.duplicate}
            </Button>
          ) : null}
        </div>
      ) : (
        <p className="text-small text-ink-muted">{t.common.adminOnly}</p>
      )}
    </Card>
  );
}
