"""Small, temporary parser/process fixtures; never substitute narration assets."""

import hashlib
import struct
import sys
import tempfile
from pathlib import Path
import unittest
import wave

import benchmark


class MeasurementTests(unittest.TestCase):
    def setUp(self):
        self.directory = tempfile.TemporaryDirectory()
        self.root = Path(self.directory.name)

    def tearDown(self):
        self.directory.cleanup()

    def pcm_fixture(self, samples, rate=24000):
        path = self.root / "parser-fixture.wav"
        with wave.open(str(path), "wb") as output:
            output.setnchannels(1)
            output.setsampwidth(2)
            output.setframerate(rate)
            output.writeframes(struct.pack("<" + "h" * len(samples), *samples))
        return path

    def test_duration_comes_from_pcm_frames_and_clipping_is_measured(self):
        path = self.pcm_fixture([32767, -32768, 0, 1000] * 6000)
        result = benchmark.inspect_wav(path)
        self.assertEqual(result["duration_seconds"], 1.0)
        self.assertEqual(result["sample_frames"], 24000)
        self.assertEqual(result["full_scale_sample_fraction"], 0.5)
        self.assertFalse(result["within_60_to_240_seconds"])

    def test_silent_file_is_rejected(self):
        with self.assertRaisesRegex(ValueError, "silence"):
            benchmark.inspect_wav(self.pcm_fixture([0] * 24))

    def test_empty_file_is_rejected(self):
        with self.assertRaisesRegex(ValueError, "Empty"):
            benchmark.inspect_wav(self.pcm_fixture([]))

    def test_truncated_file_is_rejected(self):
        path = self.pcm_fixture([1] * 24)
        path.write_bytes(path.read_bytes()[:-8])
        with self.assertRaisesRegex(ValueError, "truncated"):
            benchmark.inspect_wav(path)

    def test_unexpected_sample_rate_is_rejected(self):
        with self.assertRaisesRegex(ValueError, "24000"):
            benchmark.inspect_wav(self.pcm_fixture([1] * 24, rate=16000))

    def test_checksum_prevents_same_size_wrong_model(self):
        path = self.root / "tiny-checksum-fixture"
        path.write_bytes(b"bad!")
        lock = {"model_size_bytes": 4, "model_sha256": hashlib.sha256(b"good").hexdigest()}
        with self.assertRaisesRegex(ValueError, "SHA-256"):
            benchmark.verify_model(path, lock)

    def test_size_prevents_incomplete_download(self):
        path = self.root / "partial-file"
        path.write_bytes(b"x")
        with self.assertRaisesRegex(ValueError, "byte count"):
            benchmark.verify_model(path, {"model_size_bytes": 2, "model_sha256": "unused"})

    def test_gpu_build_is_rejected(self):
        cache = self.root / "CMakeCache.txt"
        cache.write_text("BREEZE_VULKAN:BOOL=ON\n")
        with self.assertRaisesRegex(ValueError, "BREEZE_VULKAN"):
            benchmark.cpu_cache(cache, self.root)

    def test_timeout_kills_child_and_records_usage(self):
        result = benchmark.run_measured(
            [sys.executable, "-c", "import time; time.sleep(30)"],
            self.root / "timeout.log", 0.2)
        self.assertTrue(result["timed_out"])
        self.assertEqual(result["return_code"], -9)
        self.assertGreater(result["peak_rss_kib"], 0)
        self.assertLess(result["wall_seconds"], 10)

    def test_nonzero_exit_is_not_success(self):
        result = benchmark.run_measured(
            [sys.executable, "-c", "raise SystemExit(7)"],
            self.root / "failed.log", 10)
        self.assertEqual(result["return_code"], 7)
        self.assertEqual(benchmark.assess(result, "", None), "inference_failed")

    def test_audio_does_not_hide_failure_or_gpu_backend(self):
        result = {"interrupted": False, "timed_out": False, "return_code": -6}
        log = "backend: CPU, sample rate: 24000\n"
        self.assertEqual(benchmark.assess(result, log, {"duration_seconds": 70}), "inference_failed")
        result["return_code"] = 0
        self.assertEqual(benchmark.assess(result, "backend: Vulkan0, sample rate: 24000\n", {}),
                         "cpu_backend_unconfirmed")
        self.assertEqual(benchmark.assess(result, log, None), "invalid_audio")

    def test_valid_audio_still_needs_listening(self):
        result = {"interrupted": False, "timed_out": False, "return_code": 0}
        self.assertEqual(benchmark.assess(result, "backend: CPU, sample rate: 24000\n", {}),
                         "generated_needs_listening_review")


if __name__ == "__main__":
    unittest.main()
