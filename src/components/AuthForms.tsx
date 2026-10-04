"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { Button, Field, Input, Notice } from "@/components/ui";
import {
  requestPasswordReset,
  signIn,
  signUp,
  updatePassword,
  type ActionResult,
} from "@/lib/actions";
import { fill, getDictionary } from "@/i18n/dictionaries";
import { href, type Locale } from "@/i18n/config";

/**
 * All four auth forms.
 *
 * Email and password, because that is what people expect, with a reset link for
 * the day they forget. Each form owns only its own error line; nothing here
 * tells the reader whether an address has an account.
 */

/* -------------------------------------------------------------------------- */
/* a password field with a show/hide toggle                                   */
/* -------------------------------------------------------------------------- */
function PasswordField({
  locale,
  label,
  help,
  autoComplete,
}: {
  locale: Locale;
  label: string;
  help?: string;
  autoComplete: "current-password" | "new-password";
}) {
  const dict = getDictionary(locale);
  const [shown, setShown] = useState(false);

  return (
    <Field label={label} help={help} htmlFor="password">
      <div className="relative">
        <Input
          id="password"
          name="password"
          type={shown ? "text" : "password"}
          autoComplete={autoComplete}
          required
          minLength={autoComplete === "new-password" ? 8 : undefined}
          className="pr-20"
        />
        <button
          type="button"
          onClick={() => setShown((v) => !v)}
          className="text-meta absolute right-3 top-1/2 -translate-y-1/2 text-ink-faint hover:text-ink-muted"
        >
          {shown ? dict.auth.hide : dict.auth.show}
        </button>
      </div>
    </Field>
  );
}

function useAuthAction() {
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function run(action: (data: FormData) => Promise<ActionResult>, data: FormData) {
    start(async () => {
      const result = await action(data);
      // A successful action redirects, so anything returned here is a failure.
      if (result && !result.ok) setError(result.message);
    });
  }

  return { error, setError, pending, run };
}

/* -------------------------------------------------------------------------- */
/* sign in                                                                     */
/* -------------------------------------------------------------------------- */
export function SignInForm({ locale, next }: { locale: Locale; next?: string }) {
  const dict = getDictionary(locale);
  const { error, pending, run } = useAuthAction();

  return (
    <form action={(data) => run(signIn, data)} className="mt-7 space-y-4">
      <input type="hidden" name="locale" value={locale} />
      {next ? <input type="hidden" name="next" value={next} /> : null}

      <Field label={dict.auth.email} htmlFor="email">
        <Input id="email" name="email" type="email" autoComplete="email" inputMode="email" required placeholder="nama@email.com" />
      </Field>

      <PasswordField locale={locale} label={dict.auth.password} autoComplete="current-password" />

      {error ? <p className="text-small text-terracotta">{error}</p> : null}

      <Button type="submit" size="lg" disabled={pending} className="w-full">
        {pending ? dict.common.loading : dict.auth.signIn}
      </Button>

      <div className="flex items-center justify-between pt-1">
        <Link href={href(locale, "forgotPassword")} className="text-meta text-sage-dark hover:underline">
          {dict.auth.forgot}
        </Link>
        <span className="text-meta text-ink-faint">
          {dict.auth.noAccount}{" "}
          <Link href={href(locale, "signUp")} className="text-sage-dark hover:underline">
            {dict.auth.signUp}
          </Link>
        </span>
      </div>
    </form>
  );
}

/* -------------------------------------------------------------------------- */
/* sign up                                                                     */
/* -------------------------------------------------------------------------- */
export function SignUpForm({ locale }: { locale: Locale }) {
  const dict = getDictionary(locale);
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function submit(data: FormData) {
    start(async () => {
      const result = await signUp(data);
      // A completed sign-up with a session redirects, so nothing returns here.
      if (!result) return;
      if (result.ok) {
        setError(null);
        if (result.needsConfirmation) setSent(true);
      } else {
        setError(result.message);
      }
    });
  }

  if (sent) {
    return (
      <div className="mt-7 space-y-4">
        <Notice title={dict.auth.confirmTitle}>
          {fill(dict.auth.confirmLead, { email })}
        </Notice>
        <Link
          href={href(locale, "signIn")}
          className="text-meta block text-center text-sage-dark hover:underline"
        >
          {dict.auth.signIn}
        </Link>
      </div>
    );
  }

  return (
    <form action={submit} className="mt-7 space-y-4">
      <input type="hidden" name="locale" value={locale} />

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

      <PasswordField
        locale={locale}
        label={dict.auth.password}
        help={dict.auth.passwordHelp}
        autoComplete="new-password"
      />

      {error ? <p className="text-small text-terracotta">{error}</p> : null}

      <Button type="submit" size="lg" disabled={pending} className="w-full">
        {pending ? dict.common.loading : dict.auth.signUp}
      </Button>

      <p className="text-meta pt-1 text-center text-ink-faint">
        {dict.auth.hasAccount}{" "}
        <Link href={href(locale, "signIn")} className="text-sage-dark hover:underline">
          {dict.auth.signIn}
        </Link>
      </p>
    </form>
  );
}

/* -------------------------------------------------------------------------- */
/* forgotten password                                                          */
/* -------------------------------------------------------------------------- */
export function ResetRequestForm({ locale }: { locale: Locale }) {
  const dict = getDictionary(locale);
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [pending, start] = useTransition();

  function submit(data: FormData) {
    start(async () => {
      await requestPasswordReset(data);
      // Always the same outcome, whether or not the address has an account.
      setSent(true);
    });
  }

  if (sent) {
    return (
      <div className="mt-7 space-y-4">
        <Notice title={dict.auth.resetSent}>
          {fill(dict.auth.resetSentLead, { email })}
        </Notice>
        <Link
          href={href(locale, "signIn")}
          className="text-meta block text-center text-sage-dark hover:underline"
        >
          {dict.auth.signIn}
        </Link>
      </div>
    );
  }

  return (
    <form action={submit} className="mt-7 space-y-4">
      <input type="hidden" name="locale" value={locale} />

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

      <Button type="submit" size="lg" disabled={pending} className="w-full">
        {pending ? dict.common.loading : dict.auth.sendReset}
      </Button>

      <Link
        href={href(locale, "signIn")}
        className="text-meta block text-center text-ink-faint hover:text-ink-muted"
      >
        {dict.auth.signIn}
      </Link>
    </form>
  );
}

/* -------------------------------------------------------------------------- */
/* set a new password                                                          */
/* -------------------------------------------------------------------------- */
export function NewPasswordForm({ locale }: { locale: Locale }) {
  const dict = getDictionary(locale);
  const { error, pending, run } = useAuthAction();

  return (
    <form action={(data) => run(updatePassword, data)} className="mt-7 space-y-4">
      <input type="hidden" name="locale" value={locale} />

      <PasswordField
        locale={locale}
        label={dict.auth.passwordNew}
        help={dict.auth.passwordHelp}
        autoComplete="new-password"
      />

      {error ? <p className="text-small text-terracotta">{error}</p> : null}

      <Button type="submit" size="lg" disabled={pending} className="w-full">
        {pending ? dict.common.loading : dict.auth.savePassword}
      </Button>
    </form>
  );
}
