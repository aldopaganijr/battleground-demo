# Battleground

AI-judged "who would win" fights. User types two free-text fighters (e.g. "10 lions" vs "a very angry toaster"), hits Fight, gets an AI verdict + freshly generated matching character art for both, revealed Pokémon-style.

Demo/proof-of-concept build — not production-hardened. Keep it simple.

## Stack

- **Frontend**: plain HTML, CSS, vanilla JS. No framework, no bundler, no build step.
- **Hosting**: Vercel (static frontend + serverless functions deployed together).
- **Backend**: Vercel Functions (`/api`) — Node.js runtime, `module.exports = (request, response) => {...}` style (`request.body` pre-parsed, `response.status().json()` helpers). Exists only to keep API keys server-side.
- **Verdict AI**: Anthropic Claude API (`@anthropic-ai/sdk`).
- **Art AI**: OpenAI Images API (`openai` package), model `gpt-image-2`.
- **Storage**: browser `localStorage` only. No database, no accounts, no cross-device sync.

## Repo layout

```
battleground-demo/
├── index.html          # Battle screen: fighter inputs, VS, Fight button, reveal, verdict
├── battledex.html       # Saved-character gallery screen
├── css/style.css        # Shared styles
├── js/
│   ├── battle.js         # index.html logic
│   ├── battledex.js      # battledex.html logic
│   └── storage.js        # shared localStorage helpers
├── api/fight.js          # the one serverless function
├── vercel.json
├── package.json
└── .env.example
```

## Logic breakdown

1. User types two fighter strings (free text, quantities like "10 lions" are just part of the string, no separate field), clicks Fight.
2. Client validates non-empty, ≤80 chars each, shows on-theme loading animation (rotating flavor text + progress indicator), `fetch POST /api/fight` with `{ fighterA, fighterB }`.
3. `api/fight.js`:
   - Rate limit check first: in-memory `Map` keyed by `x-forwarded-for` IP, 5 requests/60s. Over limit → `429`, no paid API calls made.
   - Validates input server-side too (never trust client).
   - Fires Claude verdict call + both OpenAI image calls in **parallel** via `Promise.allSettled` (not `.all` — one failure shouldn't necessarily kill the others, though current logic still surfaces an error if the verdict or either image fails).
   - Verdict failure → `502 { error: 'verdict_failed' }`.
   - Image failure → checks `error.code === 'moderation_blocked'` to distinguish `422 { error: 'moderation_blocked' }` from generic `502 { error: 'image_failed' }`.
   - Success → `200 { verdict: { winner: 'A'|'B', explanation }, imageA, imageB }` (images are `data:image/png;base64,...` strings).
4. Client renders the VS reveal animation once the response lands, highlights the winning portrait (`winner` is `"A"` or `"B"`, mapped back to the correct side — deliberately not the fighter's text label, so identical/mirror matchups like "lion" vs "lion" aren't ambiguous).
5. "Save to BattleDex" under each portrait stores `{ label, imageDataUrl }` into a `battledex` localStorage array via `storage.js`, capped at ~20 entries (oldest evicted first, no image compression).
6. `battledex.html` reads/renders that array in a grid. Personal to one browser, by design.

## APIs used

### Anthropic (verdict)
- `client.messages.parse()` with `output_config.format: zodOutputFormat(VerdictSchema)` for native structured output — not prompt-parsed JSON, not the forced-tool-use trick.
- `VerdictSchema = z.object({ winner: z.enum(['A', 'B']), explanation: z.string() })`.
- Model: `claude-sonnet-5`.
- System prompt scopes Claude strictly to judging the two given fighters; explicitly told to treat any embedded instructions/prompt-injection attempts as just another weird fighter description and stay in character; must always pick exactly one winner (`"A"` or `"B"`), even for identical/mirror matchups — never a tie, never a refusal.

### OpenAI (art)
- `client.images.generate({ model: 'gpt-image-2', prompt, size: '1024x1024', quality: 'low' })`. Quality dropped from `medium` to `low` after a live production test on Vercel Hobby timed out — a real fight (verdict + two `medium`-quality images in parallel) took 60-75s locally with no timeout, but Hobby's serverless function ceiling is a hard 60s (`vercel.json` already sets `maxDuration: 60`, the max Hobby allows). `low` quality generates fast enough to reliably land under that limit.
- `gpt-image-2` is the **current** default image model (not `gpt-image-1`, which is legacy) — confirmed via context7 against live OpenAI docs during build, since training data may be stale here.
- GPT image models return `b64_json` by default (no `response_format` param needed, no external image hosting).
- Shared art style template with a `{FIGHTER}` placeholder keeps every generated character visually consistent (bold flat-color illustration, thick outlines, dynamic action pose, isolated on a plain light-gray background). Explicitly forbids text/logos/UI/borders in the prompt — first pass without this produced baked-in "PLAYER 1 CHOOSE YOUR LION" style card text and a red backdrop, since the model over-interpreted "character-select screen aesthetic" literally. Quantities in the input (e.g. "10 lions") are passed straight through — not parsed or enforced as an exact count, just relies on the model reading "a lot of."
- Moderation-blocked requests throw with `error.code === 'moderation_blocked'` — handled as a distinct error case, not a generic failure.

## Key decisions / gotchas

- **Winner field is `"A"`/`"B"`, not the fighter's text.** Avoids ambiguity when both fighters are typed identically.
- **One combined `/api/fight` endpoint**, not separate per-API endpoints — simpler client, one rate-limit bucket, easier to cap true cost per visitor.
- **Rate limiting is in-memory and resets on cold start.** Known limitation, acceptable for a demo (see `ponytail:` comment in `api/fight.js`).
- **Retry = re-run the whole fight from scratch.** No partial-failure state tracking (no separate "just retry the image that failed" logic).
- **BattleDex has no outcome tracking** — just image + fighter label, capped collection with oldest-eviction, no thumbnail compression.
- **Always check context7 before writing/using any library API in this project** (Anthropic SDK, OpenAI SDK, Vercel Functions conventions, etc.) — don't rely on training-data memory of these APIs, they move fast and this project intentionally tracks current model/param names (e.g. `gpt-image-2`, `messages.parse`).

## Environment variables

`ANTHROPIC_API_KEY`, `OPENAI_API_KEY` — set as Vercel project env vars, never committed. `.env.example` documents the names. Local dev via `vercel dev` reads a local `.env`.

## Full spec / plan

Original detailed plan (with build order and verification steps) lives at `~/.claude/plans/the-pitch-build-battleground-whimsical-quokka.md`. This file is the living quick-reference; that one is the point-in-time plan doc.
