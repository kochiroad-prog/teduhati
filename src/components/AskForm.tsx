"use client";

import { useState } from "react";
import { Button, Card, Pill, Textarea } from "@/components/ui";
import { Tumi } from "@/components/Tumi";
import { getDictionary } from "@/i18n/dictionaries";
import type { Locale } from "@/i18n/config";

export function AskForm({
  locale,
  childId,
  remaining,
  limitMessage,
}: {
  locale: Locale;
  childId: string;
  remaining: number | null;
  limitMessage: string;
}) {
  const dict = getDictionary(locale);
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const blocked = remaining !== null && remaining <= 0;

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!question.trim() || busy) return;

    setBusy(true);
    setError(null);
    setAnswer(null);

    try {
      const response = await fetch("/api/ai/ask", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ question, childId, locale }),
      });

      const json = (await response.json()) as { answer?: string; message?: string; error?: string };

      if (response.ok && json.answer) {
        setAnswer(json.answer);
        setQuestion("");
      } else if (response.status === 402) {
        setError(json.message ?? limitMessage);
      } else if (json.error === "ai_not_configured") {
        setError(
          locale === "en"
            ? "The assistant isn't connected yet. Add the AI keys to the environment to switch it on."
            : "Asisten belum tersambung. Tambahkan kunci AI di environment untuk menyalakannya.",
        );
      } else {
        setError(dict.common.errorLead);
      }
    } catch {
      setError(dict.common.errorLead);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <form onSubmit={submit} className="space-y-3">
        <Textarea
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder={dict.ask.placeholder}
          maxLength={1000}
          disabled={blocked}
          aria-label={dict.ask.title}
        />

        <div className="flex items-center gap-3">
          <Button type="submit" disabled={busy || blocked || !question.trim()} className="flex-1">
            {busy ? dict.ask.thinking : dict.ask.send}
          </Button>
          {remaining !== null ? (
            <Pill>
              {remaining} {locale === "en" ? "left" : "tersisa"}
            </Pill>
          ) : null}
        </div>
      </form>

      {blocked ? <p className="text-small text-ink-muted">{limitMessage}</p> : null}
      {error ? <p className="text-small text-terracotta">{error}</p> : null}

      {answer ? (
        <Card className="animate-grow-in">
          <div className="mb-3 flex items-center gap-2">
            <Tumi state="thinking" size={32} />
            <p className="text-meta text-ink-faint">{dict.brand.name}</p>
          </div>
          <p className="text-body whitespace-pre-wrap">{answer}</p>
        </Card>
      ) : null}
    </div>
  );
}
