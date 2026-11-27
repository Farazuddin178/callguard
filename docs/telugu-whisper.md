# Telugu Whisper model

The bundled Telugu clip check uses multilingual Whisper Small and shows a beta notice. In the CPU evaluation, the Telugu fine-tune got three of four synthetic verdicts right, including the OTP scam. It missed the prize-fee scam. Live guarding and clips set to automatic language detection use the regular multilingual models. [Audio evaluation](evidence/audio-eval.md).

## Build the model locally

Use Python with Transformers 4.48.2, PyTorch 2.6, Optimum 1.24 with its ONNX dependencies, ONNX 1.18 and ONNX Runtime 1.23. Download the pinned checkpoint to a temporary directory outside this checkout. Run the export and evaluation below, using the actual local directories as the two arguments. The converter quantizes the encoder and both decoder branches, merges the decoder and derives cache positions inside the graph for Transformers.js 3. [Checkpoint revision](https://huggingface.co/vasista22/whisper-telugu-base/tree/58520d69478a7ec42a6683c3f94fd5eab0b91366), [export script](../scripts/export-whisper-onnx.py).

```sh
python scripts/export-whisper-onnx.py <checkpoint-directory> <output-directory>
npm run eval:audio -- --model-path <output-directory> --language te --output <report-path>
```

Keep the ONNX files under `onnx/` and the processor files at the model root. The required JSON files are `config.json`, `generation_config.json`, `preprocessor_config.json`, `tokenizer.json` and `tokenizer_config.json`. The two weights occupy 105,041,814 bytes together. The encoder is 25,866,796 bytes and the merged decoder is 79,175,018 bytes. With the processor files the model is about 110 MB. [Model licence and credit](../THIRD_PARTY_NOTICES.md#telugu-whisper-evaluation).

## Enable the model after hosting

1. For Hugging Face, place the export in the `main` branch of a public model repository with the Apache-2.0 licence, model card, upstream credit and a description of the conversion. Set `VITE_TELUGU_WHISPER_MODEL_ID=owner/callguard-telugu-q8` for the app build and rebuild. The current content security policy allows Hugging Face and its asset hosts. [App content security policy](../vercel.json).
2. For same-origin Vercel hosting, put a copy of the export in the ignored `public/models/callguard-telugu-q8` directory of a local build staging checkout. Set `VITE_TELUGU_WHISPER_MODEL_ID=/models/callguard-telugu-q8`. Build with `vercel build` and deploy via `vercel deploy --prebuilt` on a plan that accommodates the static files. Vercel documents a CLI source upload limit of 100 MB for Hobby and 1 GB for Pro. The two weights alone exceed the Hobby source limit. The limits page gives a combined source budget, and the separate inline MCP deploy tool has a 3 MiB per-file limit. [Vercel static uploads](https://vercel.com/docs/limits#static-file-uploads), [Vercel prebuilt deploys](https://vercel.com/docs/cli/deploy#prebuilt), [Vercel MCP inline limits](https://vercel.com/docs/agent-resources/vercel-mcp/tools/deployments).

Test the hosted asset URLs and check a Telugu sample in a browser preview before promoting it. The model loads on demand outside the app shell cache. Clear `VITE_TELUGU_WHISPER_MODEL_ID` and rebuild to return to Whisper Small. The ONNX files were evaluated locally, and the hosting paths have yet to be exercised in a deployed app.
