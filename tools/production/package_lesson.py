#!/usr/bin/env python3
"""Assemble measured CPU narration and original illustrations; validate with the app's JVM parser."""
import argparse
import hashlib
import json
import os
from pathlib import Path
import subprocess
import sys
import tempfile
import zipfile

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "tools/breeze"))
import benchmark


def strict_json(path):
    def unique(pairs):
        obj = {}
        for key, value in pairs:
            if key in obj:
                raise ValueError("Duplicate JSON key: " + key)
            obj[key] = value
        return obj
    return json.loads(path.read_text(encoding="utf-8"), object_pairs_hook=unique,
                      parse_constant=lambda x: (_ for _ in ()).throw(ValueError("Invalid constant " + x)))


def checked_track(generation, record, part, mode):
    file = generation / f"{part}-{mode}.wav"
    audio = benchmark.inspect_wav(file)
    if audio["sha256"] != record["audio"]["sha256"] or not audio["within_60_to_240_seconds"]:
        raise ValueError("Measured track changed or is outside 1–4 minutes")
    if (audio["sample_rate_hz"], audio["channels"], audio["sample_width_bits"]) != (24000, 1, 16):
        raise ValueError("Use the measured 24 kHz mono PCM16 Breeze output")
    if audio["rms_dbfs"] is None:
        raise ValueError("Digital silence is not narration")
    return file, audio


def build(authoring, generation, output, validator=True):
    authored = strict_json(authoring)
    manifest = authored["lesson"]
    ledger = strict_json(generation / "generation.json")
    lock = strict_json(ROOT / "tools/breeze/versions.json")
    if ledger["versions"] != lock or manifest["contentType"] != ledger["contentType"]:
        raise ValueError("Generation does not use the pinned CPU inputs or content type")
    if any(r["status"] != "generated_needs_listening_review" or r["run"]["return_code"] != 0
           for r in ledger["segments"].values()):
        raise ValueError("A CPU generation failure pauses packaging")
    quality = manifest["quality"]
    if manifest["contentType"] == "USER_SOURCE":
        if not (quality["audioReviewed"] and quality["sourceCoverageReviewed"] and quality["reviewer"].strip()):
            raise ValueError("Human listening and complete source coverage review are required")
    manifest["narration"] = {"engine": "Breeze TTS 2", "backend": "CPU",
        "modelSha256": lock["model_sha256"], "codeCommit": lock["source_commit"],
        "voiceSha256": ledger["voice_sha256"]}
    media = {}
    for part in manifest["parts"]:
        image_paths = [part["illustrationPath"]]
        if part.get("scene"):
            image_paths += [part["scene"]["backgroundPath"]]
            image_paths += [layer["assetPath"] for layer in part["scene"]["layers"]]
        for image_path in image_paths:
            image = Path(authored["imageFiles"][image_path])
            if not image.is_absolute():
                image = authoring.parent / image
            media[image_path] = image.resolve()
        symbols = {s["id"]: s for s in manifest["symbols"] if s["partId"] == part["id"]}
        for mode in ("explanation", "story"):
            record = ledger["tracks"][part["id"] + "/" + mode]
            file, audio = checked_track(generation, record, part["id"], mode)
            segments = record["segments"]
            # The granularity is an actual synthesized segment, not guessed word timing.
            captions = [{"id": s["id"], "startMs": s["startMs"], "endMs": s["endMs"], "text": s["text"]} for s in segments]
            cues = []
            for s in segments:
                ids = s["symbolIds"]
                target = {"x": 0.0, "y": 0.0, "width": 1.0, "height": 1.0}
                if len(ids) == 1:
                    region = symbols[ids[0]]["region"]
                    # Leave breathing room around the highlighted object.
                    x = max(0, region["x"] - .08); y = max(0, region["y"] - .08)
                    right = min(1, region["x"] + region["width"] + .08)
                    bottom = min(1, region["y"] + region["height"] + .08)
                    target = {"x": x, "y": y, "width": right-x, "height": bottom-y}
                cues.append({"startMs": s["startMs"], "endMs": min(s["startMs"]+1400, s["endMs"]),
                             "target": target, "easing": "EASE_IN_OUT"})
            path = f"audio/{part['id']}-{mode}.wav"
            part[mode] = {"assetPath": path, "durationMs": audio["sample_frames"]*1000//24000,
                          "segments": segments, "captions": captions, "cameraCues": cues}
            media[path] = file
    manifest["assets"] = [{"path": path, "mediaType": "image/png" if path.endswith(".png") else "audio/wav",
                           "bytes": file.stat().st_size, "sha256": benchmark.sha256(file)} for path, file in media.items()]
    if output.exists():
        raise ValueError("Output already exists; choose a revision filename")
    output.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory(prefix="sketcy-package-", dir=output.parent) as work:
        temporary = Path(work) / "lesson.zip"
        with zipfile.ZipFile(temporary, "w", zipfile.ZIP_DEFLATED, compresslevel=6, allowZip64=False) as archive:
            archive.writestr("manifest.json", json.dumps(manifest, ensure_ascii=False, indent=2)+"\n")
            for path, file in media.items():
                archive.write(file, path)
        if validator:
            env = {**os.environ, "SKETCY_PACKAGE_PATH": str(temporary)}
            subprocess.run([str(ROOT / "gradlew"), ":lesson-model:run", "--no-daemon"], cwd=ROOT, env=env, check=True)
        temporary.replace(output)
    print(f"Saved {output.name}; SHA-256 {benchmark.sha256(output)}")
    return manifest


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--authoring", type=Path, required=True)
    parser.add_argument("--generation", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    if args.output.resolve().is_relative_to(ROOT):
        parser.error("Generated lesson packages must stay outside the source repository")
    build(args.authoring.resolve(), args.generation.resolve(), args.output.resolve())


if __name__ == "__main__":
    main()
