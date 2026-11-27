# Third-party notices

## ThreeUI Community 1.2.0

- Predictive Arc (`PredictiveArcCanvas`) — MIT. CallGuard uses its 2D canvas renderer with CallGuard's existing fonts and illustrations.
- [Community source](https://github.com/MengTo/threeui)

```text
MIT License

Copyright (c) 2026 Meng To

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

## Synthetic sample clips

- English uses eSpeak NG via [espeak-ng npm 1.0.2](https://github.com/ianmarmour/espeak-ng.js), compiled to WebAssembly. Its synthesizer and formant voice data are GPL-3.0-or-later, with no non-commercial restriction. The English samples alternate the `+m3` and `+f3` voice variants. [eSpeak NG license](https://github.com/espeak-ng/espeak-ng#license).
- The Hindi SIM sample uses Meta MMS-TTS VITS weights under CC BY-NC 4.0, with a non-commercial condition. Local Transformers 4.48.2 and PyTorch 2.6.0 synthesized it. The replying voice uses a second pitch from the single-speaker model. The baseline used the same method for all Hindi and Telugu clips. [MMS Hindi](https://huggingface.co/facebook/mms-tts-hin), [MMS Telugu](https://huggingface.co/facebook/mms-tts-tel), [CC BY-NC 4.0](https://creativecommons.org/licenses/by-nc/4.0/).
- The other three Hindi clips and all four Telugu clips use Indic Tiny TTS by Sulabh Katiyar, generated locally with PyTorch 2.6.0. The dialogues alternate the male and female voices trained on AI4Bharat Rasa. The acoustic weights are CC BY 4.0. The inference code and Vocos weights are MIT. [Hindi voice](https://huggingface.co/sulabhkatiyar/indic-tiny-tts-hindi/blob/1fb1b108ee6ffb73ee74bd68b283ec13eb39e957/LICENSE.md), [Telugu voice](https://huggingface.co/sulabhkatiyar/indic-tiny-tts-telugu/blob/fb552545f06d76d7b5d6365827b69c0bda465767/LICENSE.md), [AI4Bharat Rasa](https://huggingface.co/datasets/ai4bharat/Rasa), [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/).
- Local FFmpeg with LAME encoded all clips as mono 32 kbps MP3. The repository ships the generated audio and its original CallGuard scripts. Synthesis weights and tool binaries are used during generation.

## Telugu Whisper evaluation

The local Telugu evaluation used `vasista22/whisper-telugu-base`, a Telugu fine-tune of OpenAI Whisper Base released under Apache-2.0. The q8 conversion uses Optimum and ONNX Runtime. The checkpoint and converted weights are outside the repository. [Model card](https://huggingface.co/vasista22/whisper-telugu-base), [pinned source revision](https://huggingface.co/vasista22/whisper-telugu-base/tree/58520d69478a7ec42a6683c3f94fd5eab0b91366), [Apache-2.0](https://www.apache.org/licenses/LICENSE-2.0).
