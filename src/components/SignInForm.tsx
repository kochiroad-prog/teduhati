"use client";

import { useState, useTransition } from "react";
import { Button, Field, Input, Notice } from "@/components/ui";
import { sendMagicLink } from "@/lib/actions";
import { fill, getDictionary } from "@/i18n/dictionaries";
import type { Locale } from "@/i18n/config";

export function SignInForm({ locale, next }: { locale: Locale; next?: string }) {
  const dict = getDictionary(locale);
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit(formData: FormData) {
    startTransition(async () => {
      const result = await sendMagicLink(formData);
      if (result.ok) {
        setSent(true);
        setError(null);
      } else {
        setError(result.message);
      }
    });
  }

  if (sent) {
    return (
      <div className="mt-7 space-y-4">
        <Notice title={dict.auth.linkSent}>
          {fill(dict.auth.linkSentLead, { email })}
        </Notice>
        <Button tone="quiet" onClick={() => setSent(false)} className="w-full">
          {dict.auth.requestAgain}
        </Button>
      </div>
    );
  }

  return (
    <form action={submit} className="mt-7 space-y-4">
      <input type="hidden" name="locale" value={locale} />
      {next ? <input type="hidden" name="next" value={next} /> : null}

      <Field label={dict.auth.email} htmlFor="email">
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          inputMode="email"
          required
          placeholder="nama@email.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </Field>

      {error ? <p className="text-small text-terracotta">{error}</p> : null}

      <Button type="submit" size="lg" disabled={pending} className="w-full">
        {pending ? dict.common.loading : dict.auth.sendLink}
      </Button>
    </form>
  );
}
