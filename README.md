# ClueWho

A mobile-first, Guess-Who-style celebrity guessing game. Pick a category, get a
secret photo, ask up to 5 yes/no questions (answered by an AI grounded in a
curated fact sheet), then guess who it is before time and questions run out.

Built with **Next.js 14 (App Router, TypeScript)**, **Tailwind CSS**, the
**OpenAI API** (`gpt-4o-mini` with structured output), and optional
**Supabase** persistence.

## How it works

1. **Pick a category** (Actors, Musicians, Athletes, Historical Figures,
   Scientists, Politicians, Business Leaders) or hit "Surprise me".
2. The server (`POST /api/round/start`) secretly picks a person from
   `data/people.json` and returns only their **photo + category** - never
   the name or facts - plus an opaque, signed round token.
3. Ask up to **5 free-text yes/no questions** (`POST /api/round/ask`). Each
   question is sent to OpenAI (`gpt-4o-mini`) along with that person's
   server-only fact sheet as a grounding system prompt, and the model must
   respond with a strictly constrained **Yes / No / Sometimes / Unclear**
   label (enforced via JSON-schema structured output) plus an optional short,
   non-identifying clarification.
4. **Guess at any time** (`POST /api/round/guess`) via fuzzy string matching
   (Sørensen-Dice coefficient) - guessing never consumes a question, but each
   wrong guess adds a small time penalty.
5. On a correct guess, or once all 5 questions are used
   (`POST /api/round/reveal`), the round ends: the person's name, photo, and
   a fun fact are revealed, along with a full score breakdown.

### Scoring

- Start at **1000 points**.
- **-60 points** per question used.
- **-4 points** per second elapsed.
- Each wrong guess adds **+10 "effective seconds"** to the time penalty.
- A correct guess is floored at **100 points** (before the streak bonus).
- **Streak multiplier**: +10% per consecutive round won, capped at **+100%**
  (i.e. a 10+ win streak doubles your score). A round that ends without a
  correct guess resets the streak to 0.

All scoring math is pure and unit-tested in `lib/scoring.ts` /
`lib/scoring.test.ts`.

## Project structure

```
app/
  page.tsx                 # Renders <GameBoard />
  layout.tsx               # Root layout, PWA metadata
  api/round/
    start/route.ts         # Pick a secret person, return photo + token
    ask/route.ts            # Grounded yes/no/sometimes/unclear question
    guess/route.ts          # Fuzzy-match guess check
    reveal/route.ts         # End round, return answer + score breakdown
components/
  CategoryPicker.tsx, ImageReveal.tsx, QuestionList.tsx, QuestionInput.tsx,
  GuessInput.tsx, ScoreSummary.tsx, StreakBadge.tsx, AdSlot.tsx,
  Leaderboard.tsx, GameBoard.tsx (orchestrator)
lib/
  openai.ts       # Grounded, structured-output question answering
  scoring.ts      # Pure score + streak math (unit tested)
  similarity.ts   # Dependency-free fuzzy name matching
  session.ts      # Signed, stateless round tokens
  supabase.ts     # Optional Supabase client wrappers
  people.ts       # Server-only dataset access
  leaderboard.ts  # Best-effort client-side leaderboard read/write
  types.ts        # Shared domain types
data/people.json          # Curated dataset (~12 people x 7 categories)
scripts/seed-people.ts    # Resolves real licensed photos from Wikidata/Commons
db/schema.sql             # Optional Supabase schema + RLS policy stubs
```

## Getting started

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment variables

```bash
cp .env.local.example .env.local
```

Then fill in:

- **`OPENAI_API_KEY`** (required for questions) - get one at
  <https://platform.openai.com/api-keys>. New accounts get a small free
  credit; after that, `gpt-4o-mini` is inexpensive per request.
- **`SESSION_SECRET`** (required) - any long random string, e.g.
  `openssl rand -hex 32`. Used to sign round tokens; the app falls back to an
  insecure dev-only value in development, but **must** be set in production.
- **Supabase** variables (optional) - see below.
- **`NEXT_PUBLIC_ADSENSE_CLIENT_ID`** (optional) - see "Ads" below.

### 3. (Optional) Set up Supabase

Supabase is **entirely optional** - the game works fully without it (round
state lives in signed tokens; streak/best-streak are stored in
`localStorage`). Configuring it adds a global leaderboard and lays the
groundwork for cross-device accounts.

1. Create a free project at <https://supabase.com>.
2. Open the SQL Editor and run the contents of `db/schema.sql`.
3. Copy `Project URL`, `anon public` key, and `service_role` key from
   **Project Settings > API** into `.env.local`.

The RLS policies in `db/schema.sql` are permissive stubs appropriate for a
casual, low-stakes game (anyone can insert a leaderboard entry/guest profile,
anyone can read the leaderboard). Tighten them (e.g. scope to
`auth.uid()`) before adding real user accounts or rate-limit protection.

### 4. Seed real, licensed photos

`data/people.json` ships with ~12 people across each of the 7 categories,
but the `image` field starts as a `TODO` placeholder (the app shows a 🕵️
silhouette card instead of a photo until seeded). Run:

```bash
npm run seed
```

This resolves each person's photo via **Wikidata's `P18` (image) claim**,
then the **Wikimedia Commons API** for the direct file URL, a license short
name, and a ready-to-display attribution string - written back into
`data/people.json`. We deliberately only use Commons (not arbitrary Wikipedia
article images), because Commons only hosts freely-licensed or public-domain
media with machine-readable attribution; Wikipedia articles sometimes display
non-free "fair use" images (e.g. film stills, book covers) that are legal for
Wikipedia to show in context but **not** safe for a third party to
redistribute.

Re-run `npm run seed` any time you add people to `data/people.json`, or
`npm run seed -- --force` to re-resolve everyone. If a name search is
ambiguous, set that person's `wikidataId` explicitly in `data/people.json`.

### 5. Run the dev server

```bash
npm run dev
```

Open <http://localhost:3000>.

### 6. Run tests / lint / build

```bash
npm run test     # vitest unit tests (lib/scoring.ts)
npm run lint      # next lint
npm run build     # production build
```

## Ads (AdSense now, AdMob-ready later)

`components/AdSlot.tsx` is an isolated placeholder component with no game
logic coupled to it. Today it renders a dev placeholder unless
`NEXT_PUBLIC_ADSENSE_CLIENT_ID` is set, in which case you can drop in a real
Google AdSense `<ins class="adsbygoogle">` unit (requires an **approved
AdSense account** - apply at <https://www.google.com/adsense>). When you
later wrap this app with [Capacitor](https://capacitorjs.com) for a native
iOS/Android port, swap the internals of `AdSlot.tsx` for an AdMob SDK call -
every other component only ever renders `<AdSlot />`, so no other code needs
to change.

## Security notes

- The secret person's name/facts are **never** sent to the client before a
  correct guess or explicit reveal - `lib/people.ts` is marked
  `"server-only"` so it cannot even be accidentally imported into a client
  bundle.
- Round progress (questions used, wrong guesses, elapsed time) lives in an
  HMAC-signed, tamper-proof token (`lib/session.ts`), not a database, so the
  app is fully stateless/serverless-friendly. The token is base64, not
  encrypted - don't add anything sensitive (like the person's name) to its
  payload.
- All score math is computed authoritatively on the server from the signed
  token's `startedAt`/`questionsUsed`/`wrongGuesses`, not trusted from the
  client.
- **Dependency tradeoff**: this project intentionally stays on the
  **Next.js 14.x line** (`next@14.2.35`, the latest patched 14.x release) per
  project requirements. `npm audit` reports a number of advisories whose
  fixes require major-version jumps (Next 16, Vitest 5, Zod 4,
  `eslint-config-next` 16) that would break the Next 14 requirement and/or
  the App Router APIs this project relies on. If you don't need to stay on
  Next 14, run `npm audit fix --force` and re-test before deploying to a
  security-sensitive environment.

## Remaining setup to go live

- [ ] Add a real `OPENAI_API_KEY` with billing enabled for production
      traffic volume.
- [ ] Set a strong, unique `SESSION_SECRET` in your production environment.
- [ ] `npm run seed` has already been run once (83/84 people have real,
      licensed Commons photos). `Cleopatra` has no free-use image on
      Wikidata and still shows the placeholder card - either accept this,
      pick a different person for that slot, or manually source/attribute a
      public-domain image and set it directly in `data/people.json`.
- [ ] (Optional) Set up Supabase and tighten the RLS policies in
      `db/schema.sql` for your actual abuse-prevention needs.
- [ ] (Optional) Apply for a Google AdSense account and set
      `NEXT_PUBLIC_ADSENSE_CLIENT_ID` to monetize with real ads.
- [ ] Replace the placeholder PWA icons in `public/icons/` with real branded
      artwork (192x192 and 512x512 PNGs).
