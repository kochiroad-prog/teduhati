"use client";

import { useState, useTransition } from "react";
import { Button, Field, Input, Notice } from "@/components/ui";
import { saveChild } from "@/lib/actions";
import { getDictionary } from "@/i18n/dictionaries";
import { ageInMonths, formatAge } from "@/lib/age";
import type { Locale } from "@/i18n/config";
import type { AgeBandTranslationRow, ChildRow } from "@/types/db";

export function ChildForm({
  locale,
  child,
  bandHint,
}: {
  locale: Locale;
  child: ChildRow | null;
  bandHint: AgeBandTranslationRow | null;
}) {
  const dict = getDictionary(locale);
  const [birthDate, setBirthDate] = useState(child?.birth_date ?? "");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  // Echo the age back as soon as a date is entered, so the parent can see the
  // app understood it before they commit.
  const months = /^\d{4}-\d{2}-\d{2}$/.test(birthDate)
    ? ageInMonths(birthDate)
    : null;

  function submit(formData: FormData) {
    startTransition(async () => {
      const result = await saveChild(formData);
      if (result && !result.ok) setError(result.message);
    });
  }

  return (
    <form action={submit} className="space-y-5">
      <input type="hidden" name="locale" value={locale} />
      {child ? <input type="hidden" name="id" value={child.id} /> : null}

      <Field label={dict.child.name} htmlFor="name">
        <Input
          id="name"
          name="name"
          required
          maxLength={60}
          defaultValue={child?.name ?? ""}
          placeholder={dict.child.namePlaceholder}
          autoComplete="off"
        />
      </Field>

      <Field label={dict.child.birthDate} help={dict.child.birthDateHelp} htmlFor="birth_date">
        <Input
          id="birth_date"
          name="birth_date"
          type="date"
          required
          max={new Date().toISOString().slice(0, 10)}
          value={birthDate}
          onChange={(e) => setBirthDate(e.target.value)}
        />
      </Field>

      {months !== null ? (
        <Notice>
          {formatAge(months, dict)}
          {bandHint ? ` · ${bandHint.stage_name}` : ""}
        </Notice>
      ) : null}

      <Field label={dict.child.interests} help={dict.child.interestsHelp} htmlFor="interests">
        <Input
          id="interests"
          name="interests"
          defaultValue={(child?.interests ?? []).join(", ")}
          placeholder={locale === "en" ? "cars, animals, water" : "mobil, hewan, air"}
          autoComplete="off"
        />
      </Field>

      {error ? <p className="text-small text-terracotta">{error}</p> : null}

      <Button type="submit" size="lg" disabled={pending} className="w-full">
        {pending ? dict.common.loading : dict.child.save}
      </Button>
    </form>
  );
}
