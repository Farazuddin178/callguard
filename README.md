# CallGuard

CallGuard is a privacy-first PWA for spotting scam tactics on speakerphone calls. It has an installable application shell and a deterministic detector for English, Hindi and Telugu. Hindi and Telugu both support native script and romanised speech.

## Local development

Use Node.js 22 LTS or 24 LTS and npm.

```sh
npm ci
npm run dev
npm run lint
npm run typecheck
npm test
npm run build
```

`npm run test:eval` runs the fixed 130-call evaluation and reports results overall, by category and by language and script. It also reports performance on the separate 190-call training set. Only the evaluation set sets the recall and false-positive gates. To check the production shell and its offline reload in Chromium, run `npx playwright install chromium` and `npm run test:e2e`.

On Windows, if `npm test` fails with `Cannot read properties of undefined (reading 'config')`, check the drive letter in the terminal's working directory. If it is lowercase, as in `c:\Users\DELL\callguard`, run `cd` into your project's path with an uppercase drive letter, such as `C:\Users\DELL\callguard`, and rerun `npm test`.

## Rule engine

`scoreTranscript(text, modelProbability?)` checks all five vocabularies on every transcript, including mixed-script calls. Rules look for related cues within a small number of words, such as a request near a credential or a transfer action near a protected account. Negation, reported speech and safety advice are checked in the context of each cue. The function returns a score from 0 to 100, a risk level, and every rule that fired. Scores below 30 are Safe, scores from 30 to 69 are Careful, and scores of 70 or more are Scam likely. An optional model probability can contribute at most 20 points. Each rule's explanation includes an action to take in English, Hindi and Telugu.

Detection runs on the supplied string in memory. The detector has no network, storage, or logging calls. This stage exposes the detector as a TypeScript API and does not request microphone access.

The evaluation set preserves the original 80 English and romanised Hindi calls and adds 20 Devanagari Hindi calls and 30 Telugu calls. Each language and script group is balanced between scam and safe calls. The separate training set supplies paraphrases for rule development and future classifier training. Scam scenarios are synthetic and based on public advisories. Safe scenarios include everyday calls, scam warnings and legitimate doorstep delivery conversations. [Ministry of Home Affairs digital arrest advisory](https://www.pib.gov.in/Pressreleaseshare.aspx?PRID=2020570&lang=2&reg=48), [RBI financial fraud booklet](https://www.rbi.org.in/Scripts/FS_PressRelease.aspx?prid=53372), [TRAI impersonation advisory](https://www.pib.gov.in/PressReleaseIframePage.aspx?PRID=2047369&lang=2&reg=48), [PIB electricity bill fact check](https://static.pib.gov.in/WriteReadData/specificdocs/documents/2024/sep/doc202499390401.pdf).

## Known limitations

A family member asking for an OTP for a shared streaming login can trigger a red alert. The same wording can be used to steal an account, and the transcript alone cannot establish who is asking.

See the Build and Review records in the [evidence pack](docs/evidence/README.md).
