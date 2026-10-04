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

## Design

- Colour comes from the brand book and is fixed. Everything else — radius,
  motion, type scale — is defined in `src/app/globals.css` and should be changed
  there, not per component.
- The leaf radius is a signal, not a decoration. One leading card per screen, plus
  the garden beds. Using it everywhere destroys the hierarchy it encodes.
- `/[locale]/pratinjau` is the design reference. Keep it current when the system
  changes; it `notFound()`s in production.
