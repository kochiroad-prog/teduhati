"use client";

import { Button } from "@/components/ui";
import { Tumi } from "@/components/Tumi";
import { getDictionary } from "@/i18n/dictionaries";

export default function ErrorBoundary({ reset }: { error: Error; reset: () => void }) {
  const dict = getDictionary("id");

  return (
    <div className="flex min-h-dvh items-center justify-center px-6 text-center">
      <div>
        <Tumi state="sleepy" size={96} className="mx-auto" />
        <h1 className="text-title mt-5">{dict.common.error}</h1>
        <p className="text-small mx-auto mt-2 max-w-[34ch] text-ink-muted">
          {dict.common.errorLead}
        </p>
        <Button onClick={reset} className="mt-6">
          {dict.common.retry}
        </Button>
      </div>
    </div>
  );
}
