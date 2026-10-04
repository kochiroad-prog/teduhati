"use client";

import { useState, useTransition } from "react";
import { Button, Card, Pill } from "@/components/ui";
import { logBonding } from "@/lib/actions";
import { getDictionary } from "@/i18n/dictionaries";
import type { Locale } from "@/i18n/config";
import type { BondingOfDay } from "@/types/db";

export function BondingCard({
  locale,
  childId,
  moment,
  done,
}: {
  locale: Locale;
  childId: string;
  moment: BondingOfDay;
  done: boolean;
}) {
  const dict = getDictionary(locale);
  const [logged, setLogged] = useState(done);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function markDone() {
    const data = new FormData();
    data.set("child_id", childId);
    data.set("bonding_moment_id", moment.bonding_moment_id);
    data.set("locale", locale);

    startTransition(async () => {
      const result = await logBonding(data);
      if (result.ok) {
        setLogged(true);
        setError(null);
      } else {
        setError(result.message);
      }
    });
  }

  return (
    <Card className="leaf-sm bg-[#f7ecc9]/60">
      <div className="flex items-start justify-between gap-3">
        <p className="text-section">{moment.title}</p>
        <Pill>{dict.bonding.types[moment.moment_type]}</Pill>
      </div>

      <p className="text-body mt-2 max-w-[42ch]">{moment.prompt}</p>

      <details className="mt-3">
        <summary className="text-meta cursor-pointer text-sage-dark">
          {dict.bonding.why}
        </summary>
        <p className="text-small mt-2 text-ink-muted">{moment.why_it_matters}</p>
      </details>

      {logged ? (
        <p className="text-small mt-4 text-sage-dark">{dict.home.bondingDoneAck}</p>
      ) : (
        <Button
          tone="secondary"
          onClick={markDone}
          disabled={pending}
          className="mt-4 w-full"
        >
          {pending ? dict.common.loading : dict.bonding.markDone}
        </Button>
      )}

      {error ? <p className="text-small mt-2 text-terracotta">{error}</p> : null}
    </Card>
  );
}
