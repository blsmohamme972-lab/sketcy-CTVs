"""Bridge contract fixtures only; no synthetic PCM is represented as narration."""
import copy
import hashlib
import json
from pathlib import Path
import struct
import tempfile
import unittest
from unittest.mock import patch
import zlib

from studio_package import main, prepare


def png(width, height):
    def chunk(name, data):
        return struct.pack(">I", len(data)) + name + data + struct.pack(">I", zlib.crc32(name + data))
    pixels = (b"\0" + b"\x20\x70\x50\xff" * width) * height
    return b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", struct.pack(">IIBBBBB", width, height, 8, 6, 0, 0, 0)) + chunk(b"IDAT", zlib.compress(pixels)) + chunk(b"IEND", b"")


class StudioPackageTest(unittest.TestCase):
    def setUp(self):
        self.work = tempfile.TemporaryDirectory()
        self.root = Path(self.work.name)
        for name, size in (("background.png", (128, 64)), ("object.png", (32, 24))):
            (self.root / name).write_bytes(png(*size))
        checksum = lambda name: hashlib.sha256((self.root / name).read_bytes()).hexdigest()
        self.export = {"schema": "sketcy.layer-assets.v1", "canvas": {"width": 128, "height": 64},
            "background": "background.png", "backgroundSha256": checksum("background.png"),
            "layers": [{"id": "object", "file": "object.png", "z": 0, "sha256": checksum("object.png"),
                "placement": {"x": 16, "y": 8, "width": 32, "height": 24}, "pivot": {"x": .25, "y": .75},
                "motion": {m: [{"atMs": 1000, "dx": 8, "dy": 4, "scale": 1.04, "rotation": 2}] for m in ("explanation", "story")}}]}
        segment = {"id": "s", "text": "A neutral parser fixture.", "factIds": ["f"], "symbolIds": ["object"]}
        self.handoff = {"schema": "sketcy.studio-handoff.v1",
            "lesson": {"schemaVersion": 1, "contentType": "TECHNICAL_DEMO",
                "parts": [{"id": "p", "illustrationPath": "images/scene.png"}], "symbols": [{"id": "object"}],
                "quality": {"audioReviewed": False, "sourceCoverageReviewed": False, "reviewer": ""}},
            "narrationPlan": {"parts": [{"id": "p", "tracks": {m: [copy.deepcopy(segment)] for m in ("explanation", "story")}}]},
            "timingDraft": {m: {"durationMs": 60000, "cues": [{"id": "s", "startMs": 0, "endMs": 60000}]} for m in ("explanation", "story")}}
        self.ledger = {"tracks": {"p/" + m: {"audio": {"sample_frames": 1440000},
            "segments": [{**segment, "startMs": 0, "endMs": 60000}]} for m in ("explanation", "story")}}

    def tearDown(self):
        self.work.cleanup()

    def run_prepare(self, layered=True):
        for name, value in (("studio-handoff.json", self.handoff), ("generation.json", self.ledger)):
            (self.root / name).write_text(json.dumps(value))
        if layered:
            (self.root / "layers.layer-assets.json").write_text(json.dumps(self.export))
        return prepare(self.root, self.root if layered else None, self.root)

    def test_single_image_needs_no_layer_export_and_preserves_external_review_and_camera(self):
        self.handoff["lesson"].update(schemaVersion=2, contentType="EXTERNAL_REVIEW")
        self.handoff["lesson"]["sources"] = [{"id": "source", "userProvided": False,
            "externalUrl": "https://example.org/original-source"}]
        self.handoff["timingDraft"]["story"]["cues"][0].update(cameraDurationMs=1400,
            camera={"x": .1, "y": .2, "width": .5, "height": .4}, easing="LINEAR")
        result = self.run_prepare(layered=False)
        self.assertFalse((self.root / "layers.layer-assets.json").exists())
        self.assertEqual(result["lesson"], self.handoff["lesson"])
        self.assertNotIn("scene", result["lesson"]["parts"][0])
        self.assertEqual(result["imageFiles"], {"images/scene.png": str(self.root / "images/scene.png")})
        self.assertEqual(result["cameraCues"]["p"]["story"], [{"startMs": 0, "endMs": 1400,
            "target": {"x": .1, "y": .2, "width": .5, "height": .4}, "easing": "LINEAR"}])

    def test_single_image_retains_schema_one_and_user_source_review_flags(self):
        self.handoff["lesson"]["contentType"] = "USER_SOURCE"
        result = self.run_prepare(layered=False)
        self.assertEqual(result["lesson"]["schemaVersion"], 1)
        self.assertEqual(result["lesson"]["quality"], self.handoff["lesson"]["quality"])
        self.assertEqual(result["lesson"]["contentType"], "USER_SOURCE")
        self.assertEqual(len(result["lesson"]["parts"]), 1)
        self.assertEqual(len(result["imageFiles"]), 1)

    def test_cli_can_package_a_single_image_without_layers_argument(self):
        self.run_prepare(layered=False)
        output = self.root / "lesson.zip"
        captured = {}

        def capture_build(authoring, generation, destination):
            captured.update(authoring=json.loads(authoring.read_text()), generation=generation, output=destination)

        with patch("sys.argv", ["studio_package.py", "--handoff", str(self.root), "--generation", str(self.root),
                                "--output", str(output)]), patch("studio_package.build", side_effect=capture_build):
            main()
        self.assertEqual(captured["generation"], self.root)
        self.assertEqual(captured["output"], output)
        self.assertEqual(list(captured["authoring"]["imageFiles"]), ["images/scene.png"])
        self.assertNotIn("scene", captured["authoring"]["lesson"]["parts"][0])

    def test_preserves_review_flags_and_exact_independent_pivot_and_normalized_motion(self):
        self.handoff["timingDraft"]["story"]["cues"][0].update(cameraDurationMs=1400,
            camera={"x": .1, "y": .2, "width": .5, "height": .4}, easing="LINEAR")
        result = self.run_prepare()
        self.assertEqual(result["lesson"]["schemaVersion"], 2)
        self.assertFalse(result["lesson"]["quality"]["audioReviewed"])
        layer = result["lesson"]["parts"][0]["scene"]["layers"][0]
        self.assertEqual((layer["pivotX"], layer["pivotY"]), (.25, .75))
        self.assertEqual(layer["explanation"][0]["dx"], .0625)
        self.assertEqual(layer["explanation"][0]["dy"], .0625)
        self.assertEqual(set(result["imageFiles"]), {"images/scene.png", "images/background.png", "images/object.png"})
        self.assertEqual(result["cameraCues"]["p"]["story"], [{"startMs": 0, "endMs": 1400,
            "target": {"x": .1, "y": .2, "width": .5, "height": .4}, "easing": "LINEAR"}])

    def test_guessed_or_rescaled_cues_cannot_pass_measured_boundary_check(self):
        self.handoff["timingDraft"]["story"]["cues"][0]["endMs"] = 59000
        for layered in (False, True):
            with self.subTest(layered=layered), self.assertRaisesRegex(ValueError, "actual generated segment"):
                self.run_prepare(layered=layered)

    def test_single_image_still_requires_measured_audio_duration(self):
        self.handoff["timingDraft"]["explanation"]["durationMs"] = 61000
        with self.assertRaisesRegex(ValueError, "measured CPU audio"):
            self.run_prepare(layered=False)

    def test_changed_fact_links_cannot_reuse_an_older_narration_run(self):
        self.handoff["narrationPlan"]["parts"][0]["tracks"]["story"][0]["factIds"] = ["other"]
        for layered in (False, True):
            with self.subTest(layered=layered), self.assertRaisesRegex(ValueError, "differ from synthesized"):
                self.run_prepare(layered=layered)

    def test_changed_pixels_and_escaped_paths_fail_before_package_creation(self):
        (self.root / "object.png").write_bytes(png(32, 23))
        with self.assertRaisesRegex(ValueError, "bytes changed"):
            self.run_prepare()
        self.export["layers"][0]["file"] = "../object.png"
        with self.assertRaisesRegex(ValueError, "simple filename"):
            self.run_prepare()

    def test_placement_and_stacking_metadata_must_match_exported_pixels(self):
        self.export["layers"][0]["placement"]["width"] = 31
        with self.assertRaisesRegex(ValueError, "pixels differ"):
            self.run_prepare()
        self.export["layers"][0]["z"] = 1
        with self.assertRaisesRegex(ValueError, "stacking order"):
            self.run_prepare()


if __name__ == "__main__":
    unittest.main()
