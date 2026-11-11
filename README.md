# 10Clues

A mobile-first, Guess-Who-style guessing game covering famous people, places,
and brands. Pick a category, get a secret photo, ask up to 10 yes/no questions
(answered by an AI grounded in a curated fact sheet), then guess who or what
it is before time and questions run out.

Built with **Next.js 16 (App Router, TypeScript)**, **Tailwind CSS**, the
**OpenAI API** (`gpt-4o-mini` with structured output), and optional
**Supabase** persistence.

## How it works

1. **Pick a category** (TV & Film, Musicians, Athletes, Football, Historical
   Figures, Scientists, Politicians, Business Leaders, Landmarks, Stadiums,
   Logos, Animals) or hit "All Categories".
2. The server (`POST /api/round/start`) secretly picks a person from
   `data/people.json` and returns only their **photo + category** - never
   the name or facts - plus an opaque, signed round token.
3. Ask up to **10 free-text yes/no questions** (`POST /api/round/ask`). Each
   question is sent to OpenAI (`gpt-4o-mini`) along with that person's
   server-only fact sheet as a grounding system prompt, and the model must
   respond with a strictly constrained **Yes / No / Sometimes / Unclear**
   label (enforced via JSON-schema structured output) plus an optional short,
   non-identifying clarification.
4. **Guess at any time** (`POST /api/round/guess`) via fuzzy string matching
   (Sørensen-Dice coefficient) - guessing never consumes a question, but each
   wrong guess adds a small time penalty.
5. On a correct guess, or once all 10 questions are used
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
  CategoryPicker.tsx, ImageReveal.tsx, QuestionList.tsx, AskOrGuessInput.tsx
  (single smart text box that auto-detects a question vs. a guess),
  ScoreSummary.tsx, StreakBadge.tsx, AdSlot.tsx, Leaderboard.tsx,
  GameBoard.tsx (orchestrator)
lib/
  openai.ts       # Grounded, structured-output question answering
  scoring.ts      # Pure score + streak math (unit tested)
  similarity.ts   # Dependency-free fuzzy name matching
  session.ts      # Signed, stateless round tokens
  supabase.ts     # Optional Supabase client wrappers
  people.ts       # Server-only dataset access
  leaderboard.ts  # Best-effort client-side leaderboard read/write
  types.ts        # Shared domain types
data/people.json          # Curated dataset (380 people across 12 categories)
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
state lives in signed tokens; streak/best-streak - and a short "recently
seen" list used to avoid repeating the same person two rounds in a row -
are stored in `localStorage`). Configuring it adds a global leaderboard and
lays the groundwork for cross-device accounts.

1. Create a free project at <https://supabase.com>.
2. Open the SQL Editor and run the contents of `db/schema.sql`.
3. Copy `Project URL`, `anon public` key, and `service_role` key from
   **Project Settings > API** into `.env.local`.

The RLS policies in `db/schema.sql` are permissive stubs appropriate for a
casual, low-stakes game (anyone can insert a leaderboard entry/guest profile,
anyone can read the leaderboard). Tighten them (e.g. scope to
`auth.uid()`) before adding real user accounts or rate-limit protection.

### 4. Seed real, licensed photos

`data/people.json` ships with 380 people across 12 categories (50 each for
TV & Film/Musicians/Athletes/Football, 30 each for Historical Figures/
Scientists/Politicians/Business Leaders, 15 each for Landmarks/Stadiums/
Logos/Animals), and every entry already has a real, licensed photo resolved via
Wikidata + Wikimedia Commons (see below) - no seeding is required before you
can play. Re-run `npm run seed` any time you add new people to the dataset
(it only re-resolves entries with a missing/`TODO` image, so it's always
safe and cheap to run) or want to refresh existing ones with `--force`:

```bash
npm run seed              # resolve images for any newly-added people only
npm run seed -- --force   # re-resolve every person's image from scratch
```

This resolves each person's photo via **Wikidata's `P18` (image) claim**
(or `P154`, logo image, for the Logos category), then the **Wikimedia
Commons API** for the direct file URL, a license short name, and a
ready-to-display attribution string - written back into `data/people.json`.
We deliberately only use Commons (not arbitrary Wikipedia article images),
because Commons only hosts freely-licensed or public-domain
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
npm run lint      # eslint . (flat config in eslint.config.mjs)
npm run build     # production build
```

## Ads (AdSense now, AdMob-ready later)

`components/AdSlot.tsx` renders **real Google AdSense ad units** once fully
configured, and a dev placeholder otherwise - no code changes are needed to
go live, only environment variables. `app/layout.tsx` loads the AdSense
script site-wide, and `app/ads.txt/route.ts` serves a correct `ads.txt` for
your publisher ID automatically.

To go live with real ads:

1. **Apply for an AdSense account** at <https://www.google.com/adsense> for
   the domain you'll deploy to, and wait for approval (this can take days;
   Google reviews the live site, so deploy first with the placeholder ads
   and apply once it's publicly reachable).
2. Once approved, find your **publisher/client ID** (`ca-pub-...`) under
   **Account > Settings > Account information**, and set
   `NEXT_PUBLIC_ADSENSE_CLIENT_ID`.
3. Create two **Display ad** units under **Ads > By ad unit** - one for the
   banner placement, one for the interstitial (reveal-screen) placement -
   and copy each one's numeric ad slot ID into
   `NEXT_PUBLIC_ADSENSE_BANNER_SLOT_ID` / `NEXT_PUBLIC_ADSENSE_INTERSTITIAL_SLOT_ID`.
4. Redeploy with all three env vars set. Verify `https://yourdomain.com/ads.txt`
   returns your publisher line, and check **AdSense > Sites** for any
   outstanding "ads.txt" warnings (can take up to 24h to clear).
5. Real ads only render in production over HTTPS on your verified domain -
   `localhost` will keep showing the dev placeholder even with real IDs set.

When you later wrap this app with [Capacitor](https://capacitorjs.com) for a
native iOS/Android port, swap the internals of `AdSlot.tsx` for an AdMob SDK
call - every other component only ever renders `<AdSlot />`, so no other code
needs to change.

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
- **Dependency status**: the project tracks current, patched stable
  releases - **Next.js `16.4.6`** (Active LTS), **React/React-DOM
  `19.3.1`**, **OpenAI SDK `7.55.0`**, **Zod `4.6.7`**, **Vitest `5.1.0`**,
  **ESLint `10.14.0`** with `eslint-config-next@16.4.6`. `npm audit` reports
  **0 vulnerabilities**. The one class of advisory that showed up after the
  upgrade (a transitive `minimatch` ReDoS pulled in only by lint tooling,
  never shipped to production) was fixed with a targeted
  `"overrides": { "minimatch": "^11.0.6" }` in `package.json` rather than
  `npm audit fix --force`, which would have *downgraded* ESLint instead of
  genuinely fixing anything - avoid blind force-fixes for the same reason.
  Two deliberate version holds, not oversights:
  - **TypeScript stays on `5.9.x`** rather than jumping to the `7.0` line.
    TypeScript 7 is a from-scratch Go-native compiler port with stricter
    defaults (`strict: true`, `module: esnext`); the TypeScript team
    recommends adopting those behaviors incrementally rather than taking the
    jump in the same change as a framework upgrade.
  - **Tailwind CSS stays on the `3.4.x` line** (latest patch) rather than
    `4.x`, which replaces the PostCSS/`tailwind.config.ts` setup with a
    CSS-first config model. There's no security advisory forcing this move,
    so it's left as a deliberate follow-up rather than bundled into this
    upgrade.
  - Note: `next lint` was removed in Next.js 16; linting now runs via the
    ESLint CLI directly (`npm run lint` → `eslint .`) using the flat config
    in `eslint.config.mjs`.

## Going to production

### Deploy

The app is a standard Next.js app with no custom server - deploy it to
[Vercel](https://vercel.com) (zero-config, built by the Next.js team),
or any Node.js host/container platform that can run `npm run build` then
`npm run start`. Set every variable from `.env.local.example` as real
environment variables in your hosting provider's dashboard (never commit
`.env.local`).

**Deploying to Vercel (recommended, ~2 minutes):**

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/phouston67-bit/ClueWho)

1. Click the button above (or go to <https://vercel.com/new>, sign in with
   your GitHub account, and import `phouston67-bit/ClueWho`) - this step
   requires your own GitHub login, so it can't be automated on your behalf.
2. Vercel auto-detects Next.js; leave the default build settings.
3. Before the first deploy (or right after, then redeploy), add the
   environment variables from `.env.local.example` under **Settings >
   Environment Variables**: at minimum `OPENAI_API_KEY` and
   `SESSION_SECRET` to make the game playable; add the Supabase and AdSense
   variables later once those accounts exist (see below).
4. Click **Deploy**. You'll get a free `*.vercel.app` URL immediately;
   attach a custom domain later under **Settings > Domains** (needed for
   AdSense approval).

### Leaderboard (Supabase) - go live

The leaderboard code is already fully wired (`lib/supabase.ts`,
`lib/leaderboard.ts`, `components/Leaderboard.tsx`) and silently falls back
to "local only" when unconfigured - turning it on is pure configuration,
no code changes needed:

1. Create a free project at <https://supabase.com>.
2. Open the SQL Editor and run the contents of `db/schema.sql`.
3. Copy **Project URL**, **anon public** key, and **service_role** key from
   **Project Settings > API** into your production environment as
   `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and
   `SUPABASE_SERVICE_ROLE_KEY`.
4. Redeploy. The "Global leaderboard requires Supabase" placeholder in
   `components/Leaderboard.tsx` will disappear and start showing real
   scores immediately, filterable by category (All + each of the 12
   categories) and by time range (Today / This Week / This Month / All
   Time).
5. The RLS policies shipped in `db/schema.sql` are permissive stubs
   appropriate for a casual, low-stakes game (anyone can insert a
   leaderboard entry). Tighten them (rate limiting, `auth.uid()` scoping)
   before relying on this for anything competitive/real-money.

### Ads - go live

See the "Ads" section above - set `NEXT_PUBLIC_ADSENSE_CLIENT_ID`,
`NEXT_PUBLIC_ADSENSE_BANNER_SLOT_ID`, and
`NEXT_PUBLIC_ADSENSE_INTERSTITIAL_SLOT_ID` once your AdSense account and ad
units are approved.

### Remaining setup to go live

- [ ] Add a real `OPENAI_API_KEY` with billing enabled for production
      traffic volume.
- [ ] Set a strong, unique `SESSION_SECRET` in your production environment.
- [ ] `npm run seed` has been run for the full 365-person roster - all 365
      now have resolved, real, licensed Commons photos (0 TODO placeholders
      remaining). Re-run it (needs network access) any time you add more
      people to `data/people.json`. Note: Logos resolve from Wikidata's P154
      (logo image) claim rather than P18, since that's where brand artwork
      lives.
- [ ] Set up Supabase (see above) for a persistent, cross-device
      leaderboard, and tighten the RLS policies in `db/schema.sql` for your
      actual abuse-prevention needs.
- [ ] Apply for a Google AdSense account and set `NEXT_PUBLIC_ADSENSE_CLIENT_ID`
      + the two ad unit slot IDs (see "Ads" above) to monetize with real ads.
- [ ] Replace the placeholder PWA icons in `public/icons/` with real branded
      artwork (192x192 and 512x512 PNGs).
- [ ] Point a custom domain at your deployment and verify it in both
      AdSense and (if used) Google Search Console.

