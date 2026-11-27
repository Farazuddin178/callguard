# CallGuard

CallGuard helps people spot scam tactics while they are on a call. Put the call on speaker, open CallGuard, choose Telugu, Hindi or English, and tap **Guard this call**. If the risk rises, CallGuard explains which tactics it heard. A red alert tells you to hang up and offers a button to call India's 1930 cybercrime helpline. It can also speak the warning using a matching on-device voice.

[Open CallGuard](https://callguard-six.vercel.app)

Choose **Try a sample scam call** to see the flow without using the microphone. The sample uses a scripted digital-arrest call in the selected language and disables the phone and WhatsApp actions.

## Privacy

Phones don't let apps hear calls directly, so put the call on speaker first. The microphone activates only after you tap to start and allow browser access. The microphone indicator stays visible while it is on. CallGuard stops when you tap **Stop** or **I hung up**, after 60 seconds of silence, or when you leave the page or switch away from it.

Whisper turns speech into text in a worker on your device. Audio and call text stay in memory during a session and are cleared when it ends. CallGuard has no backend or analytics. The first visit caches the app shell. Guard downloads the speech runtime and model files on first use, including model weights from Hugging Face. The download screen includes the runtime and weights, which the browser caches for later offline use. Browser storage keeps your language, speech-check model size, family alert toggle and optional family number.

Family alerts are off by default. If you enable them, **Tell my family** opens WhatsApp with a short, prepared message in your language. You decide whether to press Send. The message contains no call text or detection reasons. Spoken warnings use installed local voices. If a matching local voice is unavailable, the warning stays visible on screen.

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

`npm run test:eval` runs the fixed 130-call evaluation and reports results overall, by category and by language and script. It also reports performance on the separate 190-call training set. Only the evaluation set sets the recall and false-positive gates. For smoke tests on desktop Chromium and a Pixel 7 viewport, run `npx playwright install chromium` and `npm run test:e2e`. The tests use the mock Guard button, run each language demo, and check the shell's offline startup, precache size and on-demand speech runtime cache.

On Windows, if `npm test` fails with `Cannot read properties of undefined (reading 'config')`, check the drive letter in the terminal's working directory. If it is lowercase, as in `c:\Users\DELL\callguard`, run `cd` into your project's path with an uppercase drive letter, such as `C:\Users\DELL\callguard`, and rerun `npm test`.

## Speech check

Open **Settings → Speech check** on a real phone. Opening the page prepares the shared runtime. Choose a language and model size, tap **Start speech check**, then speak for a few seconds. Start loads the selected model and requests microphone access. The page shows the words it heard, model load time, the audio length and processing time for the latest chunk, and whether WebGPU or WASM is in use. Stop clears the words from the page and releases the microphone.

The guard uses multilingual Whisper Base with 8-bit weights (about 77 MB). Speech check also offers Tiny (about 41 MB) and Small (about 249 MB). The shared speech runtime adds about 23 MB before compression. The first download requires a connection. To check offline use, finish the download, reopen the app offline, and run the same model again. Speech is processed in four-second chunks. Speed and accuracy vary by phone, browser, language and speaker volume. Slow devices may skip older waiting chunks to keep up with the call. [Transformers.js pipeline and browser cache documentation](https://huggingface.co/docs/transformers.js/en/pipelines), [Whisper Base model files](https://huggingface.co/onnx-community/whisper-base/tree/main/onnx).

## How detection works

CallGuard reads the scam script. Voice-clone detectors look for signs that a voice was generated or altered. CallGuard looks at what the caller asks you to do, whether the voice is human or synthetic.

`scoreTranscript(text, modelProbability?)` checks five vocabularies, covering English, native-script Hindi and Telugu, and romanised Hindi and Telugu, including mixed-script calls. Rules look for nearby cues, such as a request for a PIN or a transfer to a supposed safe account. They consider negation, reported speech and safety advice. The app re-scores a rolling text window and keeps the highest score and every reason seen so far. Scores below 30 are **Safe**, 30 to 69 are **Be careful**, and 70 or higher is **Scam likely**. This flow uses the rules. The scorer also accepts an optional model probability worth up to 20 points.

1. Requests for an OTP, UPI PIN, CVV, card number or password.
2. Claims to represent the police, CBI, ED, customs, TRAI, a court or RBI.
3. Threats of arrest, a case, account freezes or digital arrest.
4. Demands to remain on a video call or keep the call secret from family.
5. Urgent deadlines and pressure to act immediately.
6. Requests to open a link or install software such as AnyDesk, TeamViewer or an APK.
7. Transfers to an alleged safe or verification account.
8. Claims that a parcel in your name contains drugs or illegal items.
9. Threats involving expired KYC, a blocked SIM or an electricity cutoff.
10. Upfront fees for a lottery, prize, refund or job offer.

The evaluation set preserves the original 80 English and romanised Hindi calls and adds 20 Devanagari Hindi calls and 30 Telugu calls. Each language and script group is balanced between scam and safe calls. The separate training set supplies paraphrases for rule development and future classifier training. Scam scenarios are synthetic and based on public advisories. Safe scenarios include everyday calls, scam warnings and legitimate doorstep delivery conversations. [Ministry of Home Affairs digital arrest advisory](https://www.pib.gov.in/Pressreleaseshare.aspx?PRID=2020570&lang=2&reg=48), [RBI financial fraud booklet](https://www.rbi.org.in/Scripts/FS_PressRelease.aspx?prid=53372), [TRAI impersonation advisory](https://www.pib.gov.in/PressReleaseIframePage.aspx?PRID=2047369&lang=2&reg=48), [PIB electricity bill fact check](https://static.pib.gov.in/WriteReadData/specificdocs/documents/2024/sep/doc202499390401.pdf).

## Known limitations

A family member asking for an OTP for a shared streaming login can trigger a red alert. The same wording can be used to steal an account, and the transcript alone cannot establish who is asking.

Some phones reserve microphone access for the call itself. Use **Speech check** to test the microphone and Telugu, Hindi or English performance on the intended phone. Browser cache eviction may require downloading the model again.

## Hosting

The Git-connected Vercel project `callguard` builds with `npm run build` and serves the static `dist` directory at the live URL above. It contains no server code. The Git integration builds previews for branches and deploys the configured production branch. [Vercel configuration](vercel.json).

See the Build and Review entries in the [evidence pack](docs/evidence/README.md).
