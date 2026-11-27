# CallGuard evidence pack

## Review: guard flow

- **Independent verification** — Before these fixes, the reviewer ran a clean `npm ci`, lint, typecheck, all 219 Vitest tests, the production build and all seven Playwright tests outside the sandbox. They checked microphone and buffer cleanup, the test-only mock hook, and Hindi and Telugu rendering.
- **First visit** — The review found a 22.8 MB precache, including the speech worker and WASM. The service worker now precaches the app shell. Guard and Speech Check prepare the speech runtime on demand through a same-origin CacheFirst route. Guard's download progress includes the runtime and missing model weights. Opening Speech Check prepares the runtime. Tapping Start loads the selected model before requesting microphone access. [Workbox runtime caching](https://developer.chrome.com/docs/workbox/caching-resources-during-runtime).
- **Accessibility and hosting** — Family alert uses a wide switch with translated On and Off labels and a visible focus ring. Buttons, links, fields and selectors have a 56 px minimum target. The risk needle angles up at both ends of the scale and pivots inside the visible gauge on the live and alert screens. The Vercel policy accepts regional Hugging Face CDN hosts and retains the microphone, referrer and content-type protections.
- **Regression coverage** — Added a generated precache test with a 2 MB cap and a test for offline reuse of the speech runtime. The browser suite checks tap targets, all three gauge levels, and the switch states on desktop Chromium and a Pixel 7 viewport. A Vitest test checks the hosting headers. [Browser tests](../../tests/e2e/), [hosting test](../../tests/hosting.test.ts).
- **Validation** — TypeScript and ESLint passed. All 220 Vitest tests passed with the in-process configuration. The fixed evaluation caught 65 of 65 scam calls and flagged zero of 65 safe calls. The unminified in-process build generated 19 precache entries totaling 1,462,302 bytes. All four speech assets were absent from the precache and matched the same-origin runtime route. Playwright discovered 18 test runs. The standard production build and browser runs for these fixes await external verification.
- **Codex features** — Codex CLI and repository guidance in [AGENTS.md](../../AGENTS.md).
- **Model** — GPT-6 via Codex.
- **Screenshots** — No screenshot files were captured for this round.

## Build: guard flow

- **Delivered** — Guard starts microphone access after an explicit tap and local model preparation. An audio worklet passes four-second chunks to a Whisper worker with WebGPU and WASM support. The session keeps the highest risk and all reasons, stops on user action, page exit or 60 seconds of silence, and clears audio and call text.
- **Experience** — Telugu, Hindi and English home, listening and alert screens. Scripted demos exercise the three flows with the microphone off. The alert offers 1930, local voice playback where available and an opt-in WhatsApp message. Settings links to a real-phone speech check with model and chunk timings.
- **Evidence** — [Session controller](../../src/session/guard-session.ts), [speech worker](../../src/speech/whisper.worker.ts), [session tests](../../tests/session.test.ts), [translation tests](../../tests/i18n.test.ts), [privacy tests](../../tests/privacy.test.ts), [Playwright guard smoke tests](../../tests/e2e/guard.spec.ts) and [static hosting configuration](../../vercel.json).
- **Validation** — TypeScript and ESLint passed. All 219 Vitest tests passed with an in-process configuration. The fixed evaluation caught 65 of 65 scam calls and raised zero red alerts on 65 safe calls. An in-process Vite build generated the app, workers, local fonts, WASM runtime and PWA precache. Playwright discovered seven tests. The standard build, browser execution and real-phone Whisper timings await verification outside the Windows sandbox.
- **Codex features** — Codex CLI and repository guidance in [AGENTS.md](../../AGENTS.md).
- **Model** — gpt-6.2-sol.
- **Screenshots** — No screenshot files were captured for this stage.

## Build: rule engine

- **Delivered** — Vite, React and strict TypeScript scaffold with Tailwind, shadcn/ui, PWA generation, ESLint, Vitest and Playwright. The fixed evaluation set preceded the detector.
- **Detection** — Thirteen explainable rules cover ten scam categories. Both English and romanised Hindi patterns run on every transcript. Explanations are included in English, Hindi and Telugu. The detector takes an optional capped model probability.
- **Evidence** — [Frozen evaluation calls](../../data/test.jsonl), [rule tests](../../tests/rules.test.ts), [scoring tests](../../tests/score.test.ts), [evaluation test](../../tests/eval.test.ts), [offline shell smoke test](../../tests/e2e/pwa.spec.ts), [GitHub Actions CI](../../.github/workflows/ci.yml), [PR evaluation report](../../.github/workflows/eval-comment.yml).
- **Validation** — The evaluation flagged 40 of 40 scam calls and zero of 40 safe calls at the red-alert threshold. Zero safe calls landed in Careful. Lint and typecheck passed. All 76 Vitest tests and PWA generation passed with a temporary local configuration that avoided subprocess creation, which the Windows sandbox blocked.
- **Codex features** — Codex CLI (`codex exec`) and repository guidance in [AGENTS.md](../../AGENTS.md).
- **Model** — gpt-6.2-sol via Codex CLI 0.172.0 (codex exec, reasoning effort high).
- **Screenshots** — No screenshot files were captured for this stage.

## Review

### Round 1

- **Independent verification** — The reviewer ran lint, typecheck, build, the Playwright offline test and all 76 Build-stage Vitest tests outside the sandbox. Each check passed.
- **Blind detector findings** — The prior detector caught 1 of 10 reworded English scams, 1 of 5 reworded romanised Hindi scams, 0 of 4 Devanagari Hindi scams, 0 of 2 Telugu-script scams and 0 of 1 romanised Telugu scams. Three of 17 safe trap calls reached the red alert. The review identified sentence-template overfitting, missing native-script coverage, overly broad advice suppression, and false alarms on reported installs and in-person OTP handoffs.
- **Changes** — The 13 rules now combine vocabulary cues within short word distances across five language and script groups. The scorer reserves an immediate red alert for direct theft-enabling requests and strongly evidenced fraud claims. The engine scopes negation, advice and reported speech to the relevant instruction and distinguishes the caller from an in-person recipient. Each translation now gives an action to take.
- **Data and tests** — Appended 50 cases before changing the rules, preserving the original 80 lines. Wrote a separate 160-call training set with no shared evaluation text. Added hits and near-misses for every rule and script, regression tests for the review findings, and overall, category and script tables for both datasets. The evaluation set alone gates recall and false-positive rate. The blind examples remain undisclosed.
- **Validation** — The evaluation flagged 65 of 65 scam calls and zero of 65 safe calls. The training report flagged 75 of 80 scam calls and zero of 80 safe calls. Its five misses had directed legal threats that scored Careful without another warning cue. No safe calls landed in Careful in either set. TypeScript and ESLint passed directly. All 174 Vitest tests across four suites passed with a temporary in-process config. The standard Vitest config hit the sandbox's esbuild subprocess restriction.
- **Codex features** — Codex CLI (`codex exec`), repository guidance in [AGENTS.md](../../AGENTS.md), and the GitHub Actions evaluation report.
- **Model** — gpt-6.2-sol via Codex CLI 0.172.0 (codex exec, reasoning effort high).
- **Screenshots** — No screenshot files were captured for this stage.

### Round 2

- **Independent verification** — Lint, typecheck, all 174 Vitest tests, the build and the Playwright offline smoke test passed outside the sandbox before this round's changes.
- **Blind detector findings** — The first revision caught 12 of 15 reworded English and romanised Hindi scams, up from 2 of 15, and 6 of 7 Devanagari Hindi and Telugu scams, up from 0 of 7. Two of 17 safe calls reached red, down from three. The remaining failures included relayed warnings about safe-account transfers, identity details linked to courier parcels, transfers that used pronouns or quantifiers, urgent callback demands, and same-day service shutoff claims.
- **Changes** — Generic speakers and reporting verbs now identify relayed demands, leaving a caller's separate direct instruction actionable. Parcel rules use explicit links between a listener's identifier and a shipment. Transfer rules use the protected destination even when the amount is implicit. An urgent callback or an impending same-day shutoff supplies urgency. The shared-streaming OTP ambiguity is documented in the README.
- **Data and tests** — Added 30 new training paraphrases and regression tests across all five language and script forms. The evaluation file is byte-for-byte unchanged. The blind examples remain undisclosed.
- **Validation** — The evaluation flagged 65 of 65 scam calls and zero of 65 safe calls. The training report flagged 90 of 95 scam calls and zero of 95 safe calls. Five safe training calls scored Careful. TypeScript and ESLint passed directly. All 208 Vitest tests across four suites passed with a temporary in-process config after the standard command hit the sandbox's esbuild subprocess restriction.
- **Codex features** — Codex CLI (`codex exec`) and repository guidance in [AGENTS.md](../../AGENTS.md).
- **Screenshots** — No screenshot files were captured for this round.
