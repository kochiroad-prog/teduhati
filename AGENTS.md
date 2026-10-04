<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# TEDUHATI — working notes

Read `README.md` first. These are the rules that aren't obvious from the code.

## Content is the product

- **The database is the source of truth.** Content is edited in the admin console
  at `/[locale]/admin/konten/*`, not in files. `content/` is the git backup.
- Never hardcode an activity, story or bonding moment in a component.
- **The safety gate lives in Postgres**, not in a script. `validate_activity`,
  `validate_story` and `validate_bonding` in `0009_admin_console.sql` refuse to
  let a row be published when an activity with materials, or one for a baby under
  twelve months, has no safety note in both locales. A script cannot protect a
  row a dashboard inserted, which is why the rule moved. `scripts/validate-content.mjs`
  still exists and still has to pass, but it now guards the backup files, not the
  database.
- The gates are DEFERRABLE constraint triggers, so the dashboard can write the
  parent row and both translations in one transaction in any order. PostgREST
  commits per request, so anything importing a *new* published row has to write
  it as a draft, add the translations, then set the status — which is what
  `scripts/seed-content.mjs` does in three passes.
- Both locales are mandatory, with the same number of steps. The editors enforce
  this by construction: a step is one row holding both languages, so adding or
  removing one changes both.
- `npm run content:export` pulls the database back into `content/`; commit that
  diff. `npm run db:seed` imports the files and **refuses** if anything was edited
  in the dashboard since the last import — `--force` is the explicit way to let
  the files win.
- An editor drafts; only an admin publishes. That split is `guard_publish_role`,
  one trigger shared by all four content tables, not eight policies.

## The product rules that shape the code

- **Never let the AI invent curriculum.** `src/lib/ai/provider.ts` sends the model
  activities already chosen by `recommend_activities` and asks it to adapt one.
  The system prompt forbids inventing activities and forbids medical advice. If
  you change that prompt, keep both constraints.
- **Never present progress as assessment.** The Growth Garden is a record of time
  spent together. No percentages, no scores, no developmental verdicts. The
  disclaimer stays on the garden screen and on every activity.
- **Never show a control that does nothing.** Where a feature isn't built yet
  (music playback, checkout), the UI says so plainly rather than offering a dead
  button.

## Database

- Schema lives in `supabase/migrations/`, numbered and re-runnable. Files avoid
  `DROP` so they can be applied repeatedly without destroying a live object.
- Text never goes in a parent table. Every content table has a `*_translations`
  companion keyed by `(id, locale)`.
- The recommendation pipeline is SQL, not application code. Changing how
  activities are ranked means editing `recommend_activities` in
  `0004_functions.sql`, not a TypeScript file.
- RLS is the access control, not the app. If you add a table, add its policies in
  the same change, and check the anon role sees nothing it shouldn't.
- `src/types/db.ts` is hand-maintained and deliberately narrow. `npm run db:types`
  replaces it with the full generated set.
- Privileged writes go through SECURITY DEFINER functions that check the caller's
  role themselves: `set_setting`, `set_content_status`, `set_user_role`,
  `grant_premium`, `cancel_subscription`, `approve_order`, `reject_order`. The
  server actions in `src/lib/admin-actions.ts` are not the security boundary —
  the functions are. A hand-crafted request from an editor's browser gets the
  same refusal the interface gives them.
- `app_settings` has no insert/update policy on purpose. `set_setting` is the
  only writer, and it range-checks each key, so a compromised session cannot
  rewrite a price.
- Every privileged action writes to `audit_log` through `log_audit`, which takes
  the actor from `auth.uid()`. The log is read-only: there is no delete, because
  a log that can be edited is not a log.

## Illustration

- Every illustration comes from the brand sticker sheet in `aset app/landing page/`,
  a single transparent PNG. `src/lib/assets.ts` is the manifest: it names each
  sticker, its path under `public/assets/`, and its real pixel size.
- That sheet is 1536x1024, so no sticker is wider than about 520px. Nothing in it
  should be stretched full-bleed across a desktop screen.
- Tumi in `src/components/Tumi.tsx` is that artwork, not a drawing. Six product
  states map onto the three poses that exist; a state without artwork borrows its
  nearest neighbour rather than introducing a second-looking mascot.
- The App Store and Google Play badges on the sheet are AI renders of other
  companies' trademarks. They are deliberately not extracted; take those from
  Apple and Google directly when the apps actually ship.

## Payments

- There is no gateway account, so the provider that works is a bank transfer an
  admin confirms. Checkout writes one row to `orders`; nothing about access
  changes until `approve_order` runs in Postgres.
- The transfer amount carries a three-digit suffix (Rp39.000 becomes Rp39.137).
  Indonesian banks often truncate a payment note, so the amount itself is the
  identifier. Never round it away.
- **Prices and the bank account are settings, not code.** They live in
  `app_settings` and are read through `getSettings()` in `src/lib/settings.ts`.
  The constants in `entitlements.ts` and the `NEXT_PUBLIC_BANK_*` variables remain
  only as the fallback for a request that could not reach the settings.
- Checkout hides itself until all three bank fields are filled, so the app never
  shows an account number it does not have. `checkoutAvailable()` is the one
  place that decides, and the server re-checks it in `startCheckout` rather than
  trusting the picker.
- A gateway's secret key stays an environment variable. That is a deployment
  credential, not something to edit in a browser.
- Adding Midtrans or Xendit means a new entry in `PROVIDERS` and a webhook that
  calls `approve_order`. It does not mean touching the rest of the flow.

## Staff

- `profiles.role` is `parent`, `editor` or `admin`. `is_staff()` grants read
  access across the user tables through RLS; `is_admin()` is what `approve_order`
  and `reject_order` check.
- Dashboard figures come from `admin_overview()` in Postgres, not from a dozen
  client queries. Add a figure there, not in the page. The same goes for
  `admin_funnel()`, `admin_top_activities()`, `admin_domain_coverage()`,
  `admin_revenue_monthly()` and `admin_users()`.
- The console's staff check lives in `src/app/[locale]/admin/layout.tsx`, once, so
  a new section cannot be added without it. The layout decides what to *show*;
  the database decides what is *allowed*.
- Routes under `/admin` are listed in `src/lib/admin/routes.ts` and the sidebar is
  generated from it. Adding a section means one entry there.
- Admin copy is `src/lib/admin/copy.ts`, separate from the parent dictionary: the
  console has its own vocabulary. Do not put `as const` on the Indonesian object —
  it makes every string a literal type and the English object stops type-checking.

## Design

- Colour comes from the brand book and is fixed. Everything else — radius,
  motion, type scale — is defined in `src/app/globals.css` and should be changed
  there, not per component.
- The leaf radius is a signal, not a decoration. One leading card per screen, plus
  the garden beds. Using it everywhere destroys the hierarchy it encodes.
- `/[locale]/pratinjau` is the design reference. Keep it current when the system
  changes; it `notFound()`s in production.
- The landing page at `/[locale]` is the only place that uses the serif display
  face. The app itself stays on one family.
- Chart colours are not the brand's sage and terracotta: that pair measures dE 12.9
  for normal vision, below the readable floor. The validated pair is documented in
  `src/components/AdminTrend.tsx`. Re-run the dataviz validator before changing it.
