"""Check regenerated exports against the versions in the repository."""

import argparse
import json
import math
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
EXPORTS = ("src/detect/model-weights.json", "tests/fixtures/model-parity.json")


def compare(expected, actual, path):
    if type(expected) is not type(actual):
        raise ValueError(f"{path}: type changed")
    if isinstance(expected, dict):
        if expected.keys() != actual.keys():
            raise ValueError(f"{path}: keys changed")
        for key in expected:
            compare(expected[key], actual[key], f"{path}.{key}")
    elif isinstance(expected, list):
        if len(expected) != len(actual):
            raise ValueError(f"{path}: length changed")
        for index, (left, right) in enumerate(zip(expected, actual, strict=True)):
            compare(left, right, f"{path}[{index}]")
    elif isinstance(expected, float):
        if not math.isclose(expected, actual, rel_tol=1e-7, abs_tol=1e-8):
            raise ValueError(f"{path}: expected {expected}, regenerated {actual}")
    elif expected != actual:
        raise ValueError(f"{path}: expected {expected!r}, regenerated {actual!r}")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("output_root", type=Path, help="Directory passed to train.py --output-root.")
    args = parser.parse_args()
    try:
        for name in EXPORTS:
            expected = json.loads((ROOT / name).read_text(encoding="utf-8"))
            actual = json.loads((args.output_root / name).read_text(encoding="utf-8"))
            compare(expected, actual, name)
            print(f"Verified {name}")
    except (OSError, ValueError) as error:
        parser.exit(1, f"Classifier export check failed. Regenerate with python training/train.py.\n{error}\n")


if __name__ == "__main__":
    main()
