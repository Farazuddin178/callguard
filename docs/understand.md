# Understand CallGuard

## The problem

Digital-arrest callers impersonate police, the CBI, the RBI or other authorities. A caller might claim that a parcel in the recipient's name contains drugs, demand that the person stay on a video call, then ask for money to settle a supposed case. Other impersonators threaten to freeze a bank account to pressure the recipient into giving an OTP, a PIN or card details, or installing an app. [Ministry of Home Affairs and I4C advisory, 14 May 2024](https://www.pib.gov.in/PressReleasePage.aspx?PRID=2020570&lang=2&reg=48), [RBI impersonation advisory, 29 August 2024](https://rbi.org.in/scripts/BS_PressReleaseDisplay.aspx?prid=58595).

- The Ministry of Home Affairs reported **1,23,672 incidents** of digital-arrest scams and related cybercrimes on the National Cyber Crime Reporting Portal in 2024, with **₹1,935.51 crore** defrauded. It reported **17,718 incidents** and **₹210.21 crore** through 28 February 2025. These figures cover reports across age groups and use the Ministry's combined reporting category. [Rajya Sabha written answer 1505, 12 March 2025](https://sansad.in/getFile/annex/267/AU1505_YvQaNC.pdf?source=pqars).
- The Enforcement Directorate described a case in which a senior citizen in Chennai lost **₹33 lakh** after an impersonator posing as a prosecutor told her to close her fixed deposits and transfer the money. In a July 2025 parliamentary answer, the Ministry said the National Crime Records Bureau did not separately track cybercrime complaints lodged by elderly people. [Enforcement Directorate case study, p. 51](https://static.pib.gov.in/WriteReadData/specificdocs/documents/2025/may/doc202551549501.pdf), [Ministry of Home Affairs reply on cybercrime targeting elderly people, 22 July 2025](https://www.pib.gov.in/PressReleasePage.aspx?PRID=2146786&lang=2&reg=48).

## Who it helps and how a call works

CallGuard is for older adults in India who want a warning they can understand and act on while a caller is pressuring them. The app offers Telugu, Hindi and English, large high-contrast controls, and a spoken warning when a matching local voice is available. A family member can help set up the app. The person on the call controls when it listens and whether to share an alert.

The user puts the call on speaker, opens CallGuard in the foreground, and taps **Guard this call**. The browser can request a microphone but has no access to the phone's call audio stream, so the app listens to the sound from the speaker. If the phone keeps control of the microphone during a call, the speakerphone setup can still fail. [Android audio input and call restrictions](https://developer.android.com/media/platform/sharing-audio-input#voice-call-ordinary-app), [Apple audio interruption guidance](https://developer.apple.com/library/archive/documentation/Audio/Conceptual/AudioSessionProgrammingGuide/HandlingAudioInterruptions/HandlingAudioInterruptions.html).

Whisper transcribes short chunks on the device. The detector looks for scam tactics in the words it hears. A red alert explains the rule hits and tells the user to hang up. The user can then contact the organisation through an independently verified number or report cyber fraud to **1930**. [I4C reporting guidance](https://www.pib.gov.in/PressReleasePage.aspx?PRID=2020570&lang=2&reg=48).

## Privacy and misuse

| Threat | Mitigation |
| --- | --- |
| Covert or accidental listening | Only an explicit start tap can activate the microphone, after browser permission. The app shows a visible microphone indicator and a Stop button. Listening ends on Stop, after 60 seconds of silence, or when the app is hidden or left. There is no automatic or background listening. |
| Stalkerware or collecting calls to review later | Audio and transcript stay in memory during the session and are cleared when it ends. The app has no backend, analytics or history. It never sends audio or call text, and persistent browser storage holds only settings and static app and model assets. |
| Family alerts used for monitoring | Alerts are off by default. If enabled, the user opens a prefilled WhatsApp message and presses Send there. It contains a fixed one-line alert and never includes the transcript or rule reasons. |
| A cloud speech fallback silently changes the privacy model | On-device speech is the default. An online speech feature would require an explicit label in the UI and README and an on-device default wherever possible. The initial model download fetches static assets. |
| False reassurance from a low score | The screen says “No warning signs heard so far.” Missed words or unfamiliar tactics can yield a low score. The score cannot authenticate a caller. Red alerts require a rule hit and show the warning signs and an action. |

The microphone performs live listening and transcription. CallGuard creates no saved call recording or transcript. Use it for calls you participate in and respect the privacy of others who can be heard on speakerphone. Check applicable permission and disclosure requirements for any use beyond personal call protection. [CallGuard privacy requirements](../AGENTS.md#non-negotiable-privacy-rules).

## Main risks to validate

- **On-device Telugu accuracy and speed.** Dialects, code-switching, noisy speaker audio and slow WASM can hide important words or delay a warning. Measure actual transcripts and time to warning on representative phones in Telugu, Hindi and English. Use the speech-check page to record backend and chunk timings.
- **Browser and phone support.** Test permission denial, microphone contention during a call, foreground changes, local voice availability, WebGPU and WASM, and offline startup after the initial speech download. A desktop mock cannot establish same-phone call support.
- **False alarms and missed scams.** A genuine call can share the vocabulary of a scam. The fixed evaluation includes legitimate courier, banking and family calls, tracks false positives and recall, and preserves the wording of earlier examples. Also review unfamiliar paraphrases and partial transcripts. Synthetic scripts measure detector behaviour under controlled conditions. Real-call performance depends on the device, the audio and the words Whisper produces. [Evaluation suite](../tests/eval.test.ts), [known limitations](../README.md#known-limitations).
