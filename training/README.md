# CallGuard classifier training

Use Python 3.13 to match CI. The local exports were built with Python 3.13.2. From the repository root, create and activate a virtual environment, install the pinned dependencies, and run the trainer.

```sh
python -m venv .venv-training
# PowerShell: .\.venv-training\Scripts\Activate.ps1
# Bash or zsh: source .venv-training/bin/activate
pip install -r training/requirements.txt
python training/train.py
```

The trainer fits TF-IDF character n-grams (2–5) within word boundaries and word unigrams and bigrams. Each vectorizer applies sublinear term frequency and L2-normalizes its feature block. The class-balanced liblinear logistic regression uses seed 42, and training and cross-validation run on one thread. Python and the browser share NFKC normalization, lowercasing, joiner removal and the same token boundaries. The token ranges preserve Hindi and Telugu vowel marks.

The trainer fits vocabulary, IDF and coefficients only from [the 202 training scripts](../data/train.jsonl). Each cross-validation fold refits the full pipeline with a split stratified by label and language/script. It then fits on the full training set and exports a 164,313-byte model with 4,500 features. The [model JSON](../src/detect/model-weights.json) contains versioned settings, indices, weights and the SHA-256 of the training file with LF line endings. The [parity fixture](../tests/fixtures/model-parity.json) contains three scam and three safe training texts for each of the five language/script forms, with probabilities from scikit-learn. The browser uses only the model weights, and the tests use the fixture to check inference.

The [130 held-out scripts](../data/test.jsonl) are read for reporting after fitting and export. The trainer writes both files with sorted keys and eight significant digits for each float. Two local runs produced byte-identical weights and fixtures. The [CI job](../.github/workflows/ci.yml) regenerates both in a separate directory and requires exact metadata, IDs and vocabulary indices. Its floating-point comparison allows a relative tolerance of 1e-7 and an absolute tolerance of 1e-8.

## Classifier metrics at probability 0.5

| Metric | Stratified 5-fold CV mean ± SD | Held-out test |
| --- | ---: | ---: |
| Accuracy | 70.34% ± 7.57 pp | 85.38% |
| Precision | 72.73% ± 10.15 pp | 92.59% |
| Recall | 65.21% ± 10.75 pp | 76.92% |
| F1 | 68.46% ± 9.37 pp | 84.03% |
| ROC AUC | 0.7762 ± 0.0684 | 0.9427 |
| False-positive rate | 24.80% ± 9.60 pp | 6.15% |

On the held-out set, the standalone classifier had 50 true positives, 4 false positives, 61 true negatives and 15 false negatives. ROC AUC uses the ranked probabilities across thresholds. Both datasets are synthetic and the CV results vary across folds. Speakerphone performance also depends on the device and transcript quality.

## Guard red alerts at risk score 70

The model contributes up to 20 points. Every red alert requires a rule hit. Rules only and rules plus model both flagged 65 of 65 held-out scams and zero of 65 safe calls. The combined gate is at least 90% recall and at most 10% false-positive rate. Run `npm run test:eval` for the comparison by language/script and combined results by category. [Evaluation test](../tests/eval.test.ts).
