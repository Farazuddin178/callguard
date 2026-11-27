# CallGuard evidence pack

## Build: rule engine

- **Delivered** — Vite, React and strict TypeScript scaffold with Tailwind, shadcn/ui, PWA generation, ESLint, Vitest and Playwright. The fixed evaluation set preceded the detector.
- **Detection** — Thirteen explainable rules cover ten scam categories. Both English and romanised Hindi patterns run on every transcript. Explanations are included in English, Hindi and Telugu. The detector takes an optional capped model probability.
- **Evidence** — [Frozen evaluation calls](../../data/test.jsonl), [rule tests](../../tests/rules.test.ts), [scoring tests](../../tests/score.test.ts), [evaluation test](../../tests/eval.test.ts), [offline shell smoke test](../../tests/e2e/pwa.spec.ts), [GitHub Actions CI](../../.github/workflows/ci.yml), [PR evaluation report](../../.github/workflows/eval-comment.yml).
- **Validation** — The evaluation flagged 40 of 40 scam calls and zero of 40 safe calls at the red-alert threshold. Zero safe calls landed in Careful. Lint and typecheck passed. All 76 Vitest tests and PWA generation passed with a temporary local configuration that avoided subprocess creation, which the Windows sandbox blocked.
- **Codex features** — Codex CLI (`codex exec`) and repository guidance in [AGENTS.md](../../AGENTS.md).
- **Model** — gpt-6.2-sol via Codex CLI 0.172.0 (codex exec, reasoning effort high).
- **Screenshots** — No screenshot files were captured for this stage.

## Review

- **Independent verification** — The reviewer ran lint, typecheck, build, the Playwright offline test and all 76 Build-stage Vitest tests outside the sandbox. Each check passed.
- **Blind detector findings** — The prior detector caught 1 of 10 reworded English scams, 1 of 5 reworded romanised Hindi scams, 0 of 4 Devanagari Hindi scams, 0 of 2 Telugu-script scams and 0 of 1 romanised Telugu scams. Three of 17 safe trap calls reached the red alert. The review identified sentence-template overfitting, missing native-script coverage, overly broad advice suppression, and false alarms on reported installs and in-person OTP handoffs.
- **Changes** — The 13 rules now combine vocabulary cues within short word distances across five language and script groups. The scorer reserves an immediate red alert for direct theft-enabling requests and strongly evidenced fraud claims. The engine scopes negation, advice and reported speech to the relevant instruction and distinguishes the caller from an in-person recipient. Each translation now gives an action to take.
- **Data and tests** — Appended 50 cases before changing the rules, preserving the original 80 lines. Wrote a separate 160-call training set with no shared evaluation text. Added hits and near-misses for every rule and script, regression tests for the review findings, and overall, category and script tables for both datasets. The evaluation set alone gates recall and false-positive rate. The blind examples remain undisclosed.
- **Validation** — The evaluation flagged 65 of 65 scam calls and zero of 65 safe calls. The training report flagged 75 of 80 scam calls and zero of 80 safe calls. Its five misses had directed legal threats that scored Careful without another warning cue. No safe calls landed in Careful in either set. TypeScript and ESLint passed directly. All 174 Vitest tests across four suites passed with a temporary in-process config. The standard Vitest config hit the sandbox's esbuild subprocess restriction.
- **Codex features** — Codex CLI (`codex exec`), repository guidance in [AGENTS.md](../../AGENTS.md), and the GitHub Actions evaluation report.
- **Model** — gpt-6.2-sol via Codex CLI 0.172.0 (codex exec, reasoning effort high).
- **Screenshots** — No screenshot files were captured for this stage.
