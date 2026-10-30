"""Tooling checks only. No model inference, invented medical content or substitute speech."""
import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch

from demo_authoring import authoring
from extract_source import extract
from package_lesson import build, strict_json


class ProductionTest(unittest.TestCase):
    def test_text_extraction_preserves_numbers_units_and_exact_passages(self):
        with tempfile.TemporaryDirectory() as work:
            source = Path(work) / "source.txt"
            source.write_text("The invented box is 5 cm wide.\n\nIt has 3 blue dots; never 4.\n")
            passages, method, warnings = extract(source)
            self.assertEqual(passages, {"passage 1": "The invented box is 5 cm wide.",
                                        "passage 2": "It has 3 blue dots; never 4."})
            self.assertEqual(method, "UTF-8 text")
            self.assertEqual(warnings, [])

    def test_demo_is_explicitly_nonmedical_and_unreviewed(self):
        lesson = authoring(Path("scene.png"))["lesson"]
        self.assertEqual(lesson["contentType"], "TECHNICAL_DEMO")
        self.assertFalse(lesson["quality"]["audioReviewed"])
        self.assertFalse(lesson["quality"]["sourceCoverageReviewed"])
        self.assertTrue(all(not s["userProvided"] for s in lesson["sources"]))
        sources = {s["id"]: s for s in lesson["sources"]}
        for fact in lesson["facts"]:
            for ref in fact["sources"]:
                self.assertIn(ref["quote"], sources[ref["sourceId"]]["excerpts"][ref["locator"]])
            self.assertEqual({q["type"] for q in lesson["questions"] if q["factId"]==fact["id"]},
                             {"IMAGE_RECALL", "IMAGE_OCCLUSION", "TAP_SYMBOL", "MULTIPLE_CHOICE"})

    def test_duplicate_keys_and_nonfinite_values_are_rejected(self):
        with tempfile.TemporaryDirectory() as work:
            path = Path(work) / "input.json"
            for text in ('{"revision":1,"revision":2}', '{"duration":NaN}'):
                path.write_text(text)
                with self.assertRaises(ValueError):
                    strict_json(path)

    def test_source_and_listening_gate_cannot_be_omitted_for_user_material(self):
        authored = authoring(Path("scene.png"))
        authored["lesson"]["contentType"] = "USER_SOURCE"
        lock = {"pinned": True}
        ledger = {"contentType": "USER_SOURCE", "versions": lock, "segments": {}}
        with patch("package_lesson.strict_json", side_effect=[authored, ledger, lock]):
            with self.assertRaisesRegex(ValueError, "Human listening"):
                build(Path("author.json"), Path("generation"), Path("unused.zip"))

    def test_cpu_failure_pauses_packaging(self):
        authored = authoring(Path("scene.png"))
        lock = {"pinned": True}
        ledger = {"contentType": "TECHNICAL_DEMO", "versions": lock,
                  "segments": {"failed": {"status": "failed", "run": {"return_code": 1}}}}
        with patch("package_lesson.strict_json", side_effect=[authored, ledger, lock]):
            with self.assertRaisesRegex(ValueError, "CPU generation failure"):
                build(Path("author.json"), Path("generation"), Path("unused.zip"))

    def test_model_or_content_mismatch_stops_assembly(self):
        authored = authoring(Path("scene.png"))
        with patch("package_lesson.strict_json", side_effect=[authored, {"versions": {}}, {"pinned": True}]):
            with self.assertRaisesRegex(ValueError, "pinned CPU"):
                build(Path("author.json"), Path("generation"), Path("unused.zip"))


if __name__ == "__main__":
    unittest.main()
