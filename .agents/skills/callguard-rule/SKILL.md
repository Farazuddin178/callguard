---
name: callguard-rule
description: Add or change a CallGuard scam detection rule, its vocabulary, tests, or translated explanation while preserving the held-out evaluation.
---

# Change a CallGuard scam rule

1. Read `AGENTS.md`. Write synthetic scam and safe near-miss paraphrases in `data/train.jsonl` first. Use unique IDs, existing categories and the source values `synthetic-from-public-reports` or `synthetic-safe`. Cover varied phrasing and ordinary calls that share the same words. Keep `data/test.jsonl` byte-for-byte unchanged and keep independent review examples out of training.
2. Add vocabulary in `src/detect/vocabulary.ts` for all five columns in order: English, romanised Hindi, Devanagari Hindi, romanised Telugu and Telugu script. Reuse concepts and nearby cues in `src/detect/rules.ts`. Check who makes the request and whether it is negated, quoted or advice. Preserve mixed-script matching and original-text highlights.
3. Add a hit and a near-miss in `tests/rules.test.ts` for each of the five forms. Assert the rule ID in the hit and its absence in the near-miss. Add a targeted regression case if the change affects a shared cue or highlight span.
4. Update the rule's `ruleExplanations` entry in `src/i18n/en.json`, `src/i18n/hi.json` and `src/i18n/te.json`. Describe the tactic and next safe action in plain language. Keep the rule ID consistent across the dictionaries and the engine.
5. Regenerate classifier exports after changing training rows with `python training/train.py` using `training/README.md`. Run `npm run test:eval` and `npm test`. Check the rules-only and combined tables, category misses, recall of at least 90%, and a false-positive rate of at most 10%. Keep a rule reason on every red alert. Record the results with the change.
