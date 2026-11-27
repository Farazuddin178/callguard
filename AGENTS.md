# AGENTS.md — CallGuard

## What this project is
CallGuard is a privacy-first web app (PWA) that warns elderly people, in their own language, when a phone call they are on looks like a scam (digital arrest, fake police/CBI, KYC/bank, courier/parcel, OTP/UPI PIN requests).
The user puts the call on speaker and taps **"Guard this call"**. The app listens through the microphone, turns speech into text, scores scam risk, and speaks a warning aloud in Telugu, Hindi or English.

Built for the GeeksforGeeks × OpenAI "Build with Codex" challenge. Every stage (Understand, Plan, Build, Test, Review, Document, Ship, Automate) must leave evidence in the repo.

## Non-negotiable privacy rules
These are product requirements, not suggestions. Never break them, and flag any change that would.
1. **User-started only.** Listening starts only from an explicit tap on "Guard this call" and stops when the user taps Stop or after 60 seconds of silence. No background or automatic listening.
2. **Nothing leaves the device by default.** No backend server. No analytics. No audio or transcript is sent anywhere.
3. **Nothing is stored.** Audio and transcript live only in memory during the session and are cleared when it ends. Never write them to localStorage, IndexedDB, files or logs.
4. **Always visible.** A clear on-screen indicator shows whenever the microphone is active.
5. **Family alert is opt-in and user-sent.** Off by default. When on, it opens a prefilled WhatsApp share link (wa.me) with a one-line alert; the user presses Send. Never send transcripts.
6. If a feature needs a cloud service (for example, a browser speech API that uses a server), it must be clearly labelled in the UI and README, and an on-device option must stay the default where possible.

## Architecture
- **Frontend:** Vite + React + TypeScript, installable PWA, works offline after first load.
- **UI:** Tailwind CSS + shadcn/ui. Large text (min 20px body), big buttons (min 56px), high contrast — the users are elderly.
- **Speech-to-text:** on-device Whisper via transformers.js (WebGPU, falling back to WASM). Languages: te, hi, en. Keep the STT behind an interface (`SpeechSource`) so it can be swapped.
- **Scam detection = rules first, model second:**
  - `src/detect/rules.ts` — deterministic rule engine. Each rule has an id, category, weight, patterns in en/hi/te (including romanised Hindi/Telugu), and a short plain-language explanation. Pure functions, no side effects.
  - `src/detect/model.ts` — small text classifier (TF-IDF + logistic regression trained in `/training` with Python, exported to JSON weights, run in the browser).
  - `src/detect/score.ts` — combines rule hits and model probability into a 0–100 risk score with levels: Safe (<30), Careful (30–69), Scam likely (70+). The score must always list which rules fired, so every warning can be explained.
- **Warning:** Web Speech Synthesis speaks the warning in the call's language, plus a full-screen red alert with "Hang up" guidance and the 1930 cybercrime helpline.
- **Hosting:** static site on Vercel (or Cloudflare Pages). No server code.

## Rule categories to cover (minimum)
1. Asks for OTP, UPI PIN, CVV, card number or passwords
2. Claims to be police, CBI, ED, customs, TRAI, court or RBI
3. Threatens arrest, case, account freeze or "digital arrest"
4. Demands the person stays on video call / doesn't tell family (secrecy, isolation)
5. Urgency and pressure ("within 1 hour", "immediately")
6. Asks to install an app (AnyDesk, TeamViewer, APK) or click a link
7. Asks to transfer money to a "safe" or "verification" account
8. Parcel/courier with drugs or illegal items in the person's name
9. KYC expiry / SIM block / electricity disconnection
10. Lottery, prize, refund or job offer requiring a fee

## Data
- Training and test scripts live in `/data` as JSONL: `{ "id", "lang", "text", "label": "scam"|"safe", "categories": [], "source" }`.
- Scam examples are written from public advisories and news reports of real scam patterns; mark them `"source": "synthetic-from-public-reports"`. Safe examples must include normal calls that share words with scams (a real bank call about a branch visit, a real courier delivery call, a family call mentioning "police").
- Never include real people's phone numbers, names or recordings.

## Testing (required)
- Vitest for unit tests. Every rule has tests for at least one hit and one near-miss in each language it supports.
- `tests/eval.test.ts` runs the full `/data/test.jsonl` set and fails if scam recall < 0.90 or false-positive rate > 0.10. Print a per-category table.
- Playwright smoke test: start guarding, feed a scripted transcript through a mock `SpeechSource`, expect the red alert.
- Run `npm test` before every commit. Do not mark work done if tests fail.

## Automation
- GitHub Action `.github/workflows/ci.yml`: install, lint, typecheck, unit tests, eval test, build — on every push and PR.
- GitHub Action that comments the eval table on each PR.
- Use `@codex review` on pull requests.

## Skills

- Use `$callguard-rule` when adding or changing a scam rule. Codex loads it from `.agents/skills/callguard-rule/SKILL.md`.

## Conventions
- Small commits with clear messages (`feat:`, `fix:`, `test:`, `docs:`).
- One feature per branch and PR.
- TypeScript strict mode. No `any`.
- Keep user-facing text in `src/i18n/{en,hi,te}.json`.
- Update `README.md` and `docs/evidence/` when a stage is completed.

## Evidence pack
Keep `docs/evidence/README.md` updated with, for each stage: what was done, which Codex features were used (CLI, IDE, @codex review, AGENTS.md, skills, scheduled tasks, GitHub Action), which model, and screenshot file names in `docs/evidence/img/`.
