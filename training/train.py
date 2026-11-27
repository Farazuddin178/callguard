"""Train the offline CallGuard classifier and export its browser artifacts."""

import argparse
import hashlib
import json
import random
import re
import unicodedata
from pathlib import Path

from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import confusion_matrix, get_scorer, make_scorer
from sklearn.model_selection import StratifiedKFold, cross_validate
from sklearn.pipeline import FeatureUnion, Pipeline
from threadpoolctl import threadpool_limits


ROOT = Path(__file__).resolve().parents[1]
SEED = 42
MAX_EXPORT_BYTES = 250_000
NORMALIZER = {
    "unicodeForm": "NFKC",
    "lowercase": True,
    "removePattern": r"[\u200c\u200d]",
    # Latin letters, ASCII digits, and Devanagari and Telugu letters and vowel
    # marks. Use portable ranges so Python and JS agree on word boundaries.
    "separatorPattern": (
        r"[^a-z0-9\u00c0-\u00d6\u00d8-\u00f6\u00f8-\u024f"
        r"\u0900-\u0963\u0966-\u096f\u0972-\u097f\u0c00-\u0c63\u0c66-\u0c6f]+"
    ),
}
FORMS = ("en", "hi-latn", "hi-deva", "te-latn", "te-telu")


def normalize(text):
    text = unicodedata.normalize(NORMALIZER["unicodeForm"], text)
    if NORMALIZER["lowercase"]:
        text = text.lower()
    text = re.sub(NORMALIZER["removePattern"], "", text)
    return re.sub(NORMALIZER["separatorPattern"], " ", text).strip()


def read_calls(file):
    # Hash the UTF-8 training file with LF line endings on every platform.
    data = file.read_bytes().replace(b"\r\n", b"\n")
    rows = [json.loads(line) for line in data.decode("utf-8").splitlines()]
    return rows, hashlib.sha256(data).hexdigest()


def script(row):
    if row["lang"] == "hi":
        return "hi-deva" if re.search(r"[\u0900-\u097f]", row["text"]) else "hi-latn"
    if row["lang"] == "te":
        return "te-telu" if re.search(r"[\u0c00-\u0c7f]", row["text"]) else "te-latn"
    return "en"


def classifier():
    features = FeatureUnion([
        ("char", TfidfVectorizer(
            analyzer="char_wb", ngram_range=(2, 5), max_features=3500,
            preprocessor=normalize, lowercase=False, sublinear_tf=True, norm="l2",
        )),
        ("word", TfidfVectorizer(
            analyzer="word", ngram_range=(1, 2), max_features=1000,
            preprocessor=normalize, lowercase=False, sublinear_tf=True, norm="l2",
            tokenizer=str.split, token_pattern=None,
        )),
    ], n_jobs=1)
    return Pipeline([
        ("features", features),
        ("logistic", LogisticRegression(
            solver="liblinear", class_weight="balanced", random_state=SEED, n_jobs=1,
        )),
    ])


def false_positive_rate(labels, predictions):
    tn, fp, _, _ = confusion_matrix(labels, predictions, labels=[0, 1]).ravel()
    return fp / (fp + tn)


def rounded(number):
    return float(f"{number:.8g}")


def export_weights(model, training_hash):
    features = model.named_steps["features"]
    logistic = model.named_steps["logistic"]
    offset = 0
    analyzers = []
    for _, vectorizer in features.transformer_list:
        size = len(vectorizer.vocabulary_)
        analyzers.append({
            "analyzer": vectorizer.analyzer,
            "ngramRange": vectorizer.ngram_range,
            "sublinearTf": vectorizer.sublinear_tf,
            "norm": vectorizer.norm,
            "vocabulary": {term: int(index) for term, index in vectorizer.vocabulary_.items()},
            "idf": [rounded(value) for value in vectorizer.idf_],
            "coefficients": [rounded(value) for value in logistic.coef_[0, offset:offset + size]],
        })
        offset += size
    return {
        "analyzers": analyzers,
        "intercept": rounded(logistic.intercept_[0]),
        "normalizer": NORMALIZER,
        "trainingDataSha256": training_hash,
        "version": 1,
    }


def parity_cases(model, training):
    rng = random.Random(SEED)
    selected = [
        row
        for form in FORMS
        for label in ("scam", "safe")
        for row in rng.sample(
            [row for row in training if script(row) == form and row["label"] == label], 3
        )
    ]
    probabilities = model.predict_proba([row["text"] for row in selected])[:, 1]
    return [
        {
            "id": row["id"],
            "form": script(row),
            "label": row["label"],
            "text": row["text"],
            "probability": rounded(probability),
        }
        for row, probability in zip(selected, probabilities, strict=True)
    ]


def json_bytes(value):
    return (json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":")) + "\n").encode("utf-8")


def write_export(root, name, content):
    path = root / name
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_bytes(content)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output-root", type=Path, default=ROOT,
                        help="Write exports under this directory instead of the repo root.")
    args = parser.parse_args()
    train, training_hash = read_calls(ROOT / "data/train.jsonl")
    texts = [row["text"] for row in train]
    labels = [int(row["label"] == "scam") for row in train]
    strata = [(script(row) + "-" + row["label"]) for row in train]
    folds = StratifiedKFold(n_splits=5, shuffle=True, random_state=SEED)
    scoring = {
        metric: get_scorer(metric)
        for metric in ("accuracy", "precision", "recall", "f1", "roc_auc")
    }
    scoring["fpr"] = make_scorer(false_positive_rate)
    model = classifier()

    with threadpool_limits(limits=1):
        cv = cross_validate(model, texts, labels, cv=folds.split(texts, strata),
                            scoring=scoring, n_jobs=1, error_score="raise")
        print(f"Training set stratified 5-fold CV ({len(train)} calls), mean +/- std")
        for metric in scoring:
            values = cv[f"test_{metric}"]
            print(f"  {metric}: {values.mean():.4f} +/- {values.std():.4f}")

        model.fit(texts, labels)
        weights = json_bytes(export_weights(model, training_hash))
        if len(weights) > MAX_EXPORT_BYTES:
            raise ValueError(f"Model export is {len(weights)} bytes; limit is {MAX_EXPORT_BYTES}")
        fixtures = json_bytes(parity_cases(model, train))
        write_export(args.output_root, "src/detect/model-weights.json", weights)
        write_export(args.output_root, "tests/fixtures/model-parity.json", fixtures)
        print(f"Exported {len(weights):,} model bytes and 30 parity cases.")

        test, _ = read_calls(ROOT / "data/test.jsonl")
        test_texts = [row["text"] for row in test]
        test_labels = [int(row["label"] == "scam") for row in test]
        print(f"Classifier on the held-out set ({len(test)} calls), threshold 0.5")
        for metric, scorer in scoring.items():
            print(f"  {metric}: {scorer(model, test_texts, test_labels):.4f}")
        tn, fp, fn, tp = confusion_matrix(test_labels, model.predict(test_texts), labels=[0, 1]).ravel()
        print(f"  TP={tp} FP={fp} TN={tn} FN={fn}")


if __name__ == "__main__":
    main()
