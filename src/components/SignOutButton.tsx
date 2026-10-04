"use client";

import { Button } from "@/components/ui";
import { signOut } from "@/lib/actions";
import { getDictionary } from "@/i18n/dictionaries";
import type { Locale } from "@/i18n/config";

export function SignOutButton({ locale }: { locale: Locale }) {
  const dict = getDictionary(locale);
  return (
    <form action={signOut}>
      <input type="hidden" name="locale" value={locale} />
      <Button type="submit" tone="quiet" className="w-full">
        {dict.auth.signOut}
      </Button>
    </form>
  );
}
