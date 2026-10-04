<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# TEDUHATI — working notes

Read `README.md` first. These are the rules that aren't obvious from the code.

## Content is the product

- Activities, bonding moments and stories live in `content/` as bilingual JSON,
  never in the codebase and never hardcoded in a component.
- `npm run content:check` must pass before anything ships. It is not a lint pass;
  it is the safety gate. It refuses content where an activity with materials, or
  an activity for a baby under twelve months, has no safety note.
- Both locales are mandatory, with the same number of steps. Half-translated
  content is treated as broken content.
- After editing `content/`, run `npm run db:seed`. It upserts, so re-running is
  safe.

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
- Checkout hides itself until `NEXT_PUBLIC_BANK_*` is set, so the app never shows
  an account number it does not have.
- Adding Midtrans or Xendit means a new entry in `PROVIDERS` and a webhook that
  calls `approve_order`. It does not mean touching the rest of the flow.

## Staff

- `profiles.role` is `parent`, `editor` or `admin`. `is_staff()` grants read
  access across the user tables through RLS; `is_admin()` is what `approve_order`
  and `reject_order` check.
- Dashboard figures come from `admin_overview()` in Postgres, not from a dozen
  client queries. Add a figure there, not in the page.

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
