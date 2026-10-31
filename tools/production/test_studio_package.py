"""Bridge contract fixtures only; no synthetic PCM is represented as narration."""
import copy
import hashlib
import json
from pathlib import Path
import struct
import tempfile
import unittest
import zlib

from studio_package import prepare


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
            "lesson": {"parts": [{"id": "p", "illustrationPath": "images/scene.png"}], "symbols": [{"id": "object"}],
                "quality": {"audioReviewed": False, "sourceCoverageReviewed": False, "reviewer": ""}},
            "narrationPlan": {"parts": [{"id": "p", "tracks": {m: [copy.deepcopy(segment)] for m in ("explanation", "story")}}]},
            "timingDraft": {m: {"durationMs": 60000, "cues": [{"id": "s", "startMs": 0, "endMs": 60000}]} for m in ("explanation", "story")}}
        self.ledger = {"tracks": {"p/" + m: {"audio": {"sample_frames": 1440000},
            "segments": [{**segment, "startMs": 0, "endMs": 60000}]} for m in ("explanation", "story")}}

    def tearDown(self):
        self.work.cleanup()

    def run_prepare(self):
        for name, value in (("studio-handoff.json", self.handoff), ("layers.layer-assets.json", self.export), ("generation.json", self.ledger)):
            (self.root / name).write_text(json.dumps(value))
        return prepare(self.root, self.root, self.root)

    def test_preserves_review_flags_and_exact_independent_pivot_and_normalized_motion(self):
        result = self.run_prepare()
        self.assertEqual(result["lesson"]["schemaVersion"], 2)
        self.assertFalse(result["lesson"]["quality"]["audioReviewed"])
        layer = result["lesson"]["parts"][0]["scene"]["layers"][0]
        self.assertEqual((layer["pivotX"], layer["pivotY"]), (.25, .75))
        self.assertEqual(layer["explanation"][0]["dx"], .0625)
        self.assertEqual(layer["explanation"][0]["dy"], .0625)
        self.assertEqual(set(result["imageFiles"]), {"images/scene.png", "images/background.png", "images/object.png"})

    def test_guessed_or_rescaled_cues_cannot_pass_measured_boundary_check(self):
        self.handoff["timingDraft"]["story"]["cues"][0]["endMs"] = 59000
        with self.assertRaisesRegex(ValueError, "actual generated segment"):
            self.run_prepare()

    def test_changed_fact_links_cannot_reuse_an_older_narration_run(self):
        self.handoff["narrationPlan"]["parts"][0]["tracks"]["story"][0]["factIds"] = ["other"]
        with self.assertRaisesRegex(ValueError, "differ from synthesized"):
            self.run_prepare()

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
