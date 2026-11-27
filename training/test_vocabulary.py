"""Regression tests for fitting deterministic TF-IDF vocabularies."""

from itertools import permutations
from unittest import TestCase

from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.model_selection import cross_validate

from training.train import DeterministicTfidf, classifier, normalize


class VocabularyTests(TestCase):
    def test_corpus_counts_and_alphabetical_ties_ignore_document_order(self):
        vectorizer = TfidfVectorizer(preprocessor=normalize, lowercase=False)
        documents = ["ＡＬＦＡ!", "beta", "Echo", "Zulu zulu ZULU"]
        for order in permutations(documents):
            with self.subTest(order=order):
                fitted = DeterministicTfidf(vectorizer, max_features=2).fit(iter(order))
                self.assertEqual(fitted.vectorizer_.vocabulary_, {"alfa": 0, "zulu": 1})

    def test_each_fold_fits_both_vocabularies_on_its_training_rows(self):
        documents = ["common zxq", "common zxq", "common yjk", "common yjk"]
        folds = [([0, 1], [2, 3]), ([2, 3], [0, 1])]
        results = cross_validate(classifier(), documents, [0, 1, 0, 1], cv=folds,
                                 return_estimator=True, error_score="raise")

        for model, (present, absent) in zip(results["estimator"], [("zxq", "yjk"), ("yjk", "zxq")], strict=True):
            for name, transformer in model.named_steps["features"].transformer_list:
                with self.subTest(analyzer=name, token=present):
                    vocabulary = transformer.vectorizer_.vocabulary_
                    self.assertIn(present, vocabulary)
                    self.assertNotIn(absent, vocabulary)
