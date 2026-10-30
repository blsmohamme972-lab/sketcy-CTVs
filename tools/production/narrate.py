#!/usr/bin/env python3
"""Generate fact-linked segments with pinned Breeze Q8_0 CPU and a shared synthetic voice.

The output is authoring material, never automatic medical or listening approval.
"""
import argparse
import hashlib
import json
from pathlib import Path
import sys
import wave

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "tools" / "breeze"))
import benchmark


def write_json(path, data):
    temporary = path.with_suffix(".partial.json")
    temporary.write_text(json.dumps(data, indent=2) + "\n")
    temporary.replace(path)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--plan", required=True, type=Path)
    parser.add_argument("--breeze-dir", required=True, type=Path)
    parser.add_argument("--model", required=True, type=Path)
    parser.add_argument("--anchor-wav", required=True, type=Path)
    parser.add_argument("--anchor-text", required=True, type=Path)
    parser.add_argument("--output", required=True, type=Path)
    parser.add_argument("--timeout-seconds", type=float, default=1800)
    args = parser.parse_args()
    output = args.output.resolve()
    if output.is_relative_to(ROOT):
        parser.error("Generated media must be outside the source repository")
    output.mkdir(parents=True, exist_ok=True)
    lock = json.loads((ROOT / "tools/breeze/versions.json").read_text())
    source = args.breeze_dir.resolve()
    benchmark.verify_source(source, lock)
    benchmark.cpu_cache(source / "build-cpu/CMakeCache.txt", source)
    benchmark.verify_model(args.model, lock)
    binary = source / "build-cpu/breeze-cli"
    plan = json.loads(args.plan.read_text())
    anchor_text = args.anchor_text.read_text().strip()
    identity = {
        "plan_sha256": benchmark.sha256(args.plan), "versions": lock,
        "anchor_sha256": benchmark.sha256(args.anchor_wav),
        "anchor_text": anchor_text, "binary_sha256": benchmark.sha256(binary),
        "reviewStatus": "UNREVIEWED", "contentType": plan["contentType"],
    }
    ledger_path = output / "generation.json"
    if ledger_path.exists():
        ledger = json.loads(ledger_path.read_text())
        if any(ledger[k] != v for k, v in identity.items()):
            raise ValueError("Resume inputs changed; choose a new output directory")
    else:
        ledger = {**identity, "environment": benchmark.environment(), "segments": {}, "tracks": {}}
        write_json(ledger_path, ledger)
    voice_dir = output / "voices"
    voice_dir.mkdir(exist_ok=True)
    voice = voice_dir / "neutral-anchor.breeze"
    if not voice.exists():
        cmd = [str(binary), str(args.model.resolve()), "--cpu", "--ref-audio",
               str(args.anchor_wav.resolve()), "--ref-text", anchor_text,
               "--save-voice", "neutral-anchor", "--voices-dir", str(voice_dir)]
        run = benchmark.run_measured(cmd, output / "voice.log", args.timeout_seconds)
        ledger["voice_run"] = run
        write_json(ledger_path, ledger)
        if run["return_code"] or not voice.exists():
            raise RuntimeError("CPU voice encoding failed; audio milestone paused")
    voice_hash = benchmark.sha256(voice)
    if ledger.get("voice_sha256", voice_hash) != voice_hash:
        raise ValueError("Cached synthetic voice changed; choose a new generation directory")
    if "voice_run" not in ledger or ledger["voice_run"]["return_code"] != 0:
        raise ValueError("A successful measured CPU voice encoding record is required")
    ledger["voice_sha256"] = voice_hash
    write_json(ledger_path, ledger)
    for part in plan["parts"]:
        for mode in ("explanation", "story"):
            pieces = []
            segments = []
            frame_position = 0
            for segment in part["tracks"][mode]:
                key = part["id"] + "-" + segment["id"]
                if not key.replace("-", "").replace("_", "").isalnum():
                    raise ValueError("Use simple stable IDs")
                wav = output / (key + ".wav")
                if key in ledger["segments"]:
                    record = ledger["segments"][key]
                    if not wav.exists() or benchmark.sha256(wav) != record["audio"]["sha256"]:
                        raise ValueError("Previously measured segment bytes changed")
                else:
                    if wav.exists():
                        raise ValueError("Unrecorded output exists; inspect it before retrying")
                    print("Generating " + key, flush=True)
                    command = [str(binary), str(args.model.resolve()), "--cpu", "--text", segment["text"],
                               "--instruction", lock["voice_instruction"], "--voice", "neutral-anchor",
                               "--voices-dir", str(voice_dir), "--seed", str(lock["seed"]),
                               "--cfg-scale", str(lock["cfg_scale"]), "--split-chars", "0",
                               "--max-new", str(lock["max_new_frames_per_piece"]), "--timings",
                               "--output", str(wav)]
                    log_path = output / (key + ".log")
                    run = benchmark.run_measured(command, log_path, args.timeout_seconds)
                    measured = benchmark.inspect_wav(wav) if wav.exists() else None
                    status = benchmark.assess(run, log_path.read_text(errors="replace"), measured)
                    record = {"command": command, "run": run, "audio": measured, "status": status}
                    ledger["segments"][key] = record
                    write_json(ledger_path, ledger)
                    if status != "generated_needs_listening_review":
                        raise RuntimeError("CPU generation failed; audio milestone paused: " + key)
                if record["status"] != "generated_needs_listening_review":
                    raise RuntimeError("A prior CPU failure requires inspection; do not resume silently")
                count = record["audio"]["sample_frames"]
                if count >= lock["max_new_frames_per_piece"] * 1920:
                    raise ValueError("Frame cap reached; shorten and review the segment")
                segments.append({**segment, "startMs": frame_position * 1000 // 24000,
                                 "endMs": (frame_position + count) * 1000 // 24000})
                pieces.append(wav)
                frame_position += count
            track = output / (part["id"] + "-" + mode + ".wav")
            with wave.open(str(track), "wb") as assembled:
                assembled.setnchannels(1)
                assembled.setsampwidth(2)
                assembled.setframerate(24000)
                for piece in pieces:
                    with wave.open(str(piece), "rb") as audio:
                        while data := audio.readframes(24000):
                            assembled.writeframesraw(data)
            measured = benchmark.inspect_wav(track)
            if not measured["within_60_to_240_seconds"]:
                raise ValueError("Track duration outside 1–4 minutes; revise text, do not pad audio")
            ledger["tracks"][part["id"] + "/" + mode] = {"audio": measured, "segments": segments}
            write_json(ledger_path, ledger)
            print("Assembled " + mode + ": " + str(measured["duration_seconds"]) + " seconds", flush=True)
    print("CPU tracks generated; listening and source coverage review are still required.", flush=True)


if __name__ == "__main__":
    main()
