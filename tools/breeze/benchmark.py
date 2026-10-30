#!/usr/bin/env python3
"""Linux CPU feasibility probe for the pinned, standard Breeze TTS 2 Q8_0.

No model downloads, GPU fallback, medical content, or automatic quality approval.
Run after the documented CPU build. All output must be outside this repository.
"""

import argparse
from array import array
from datetime import datetime, timezone
import hashlib
import json
import math
import os
from pathlib import Path
import platform
import re
import resource
import signal
import subprocess
import sys
import time
import wave


HERE = Path(__file__).resolve().parent
REPOSITORY = HERE.parent.parent


def sha256(path):
    digest = hashlib.sha256()
    with Path(path).open("rb") as source:
        for chunk in iter(lambda: source.read(8 * 1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def verify_model(path, lock):
    if path.stat().st_size != lock["model_size_bytes"]:
        raise ValueError("Model byte count does not match the pinned standard Q8_0")
    actual = sha256(path)
    if actual != lock["model_sha256"]:
        raise ValueError("Model SHA-256 does not match the pinned standard Q8_0")
    return actual


def git(source, *args):
    return subprocess.check_output(
        ["git", "-C", str(source), *args], text=True, stderr=subprocess.PIPE
    ).strip()


def verify_source(source, lock):
    actual = {"source_commit": git(source, "rev-parse", "HEAD"), "submodules": {}}
    if actual["source_commit"] != lock["source_commit"]:
        raise ValueError("Breeze source revision differs from versions.json")
    for subdir, expected in lock["submodules"].items():
        actual["submodules"][subdir] = git(source / subdir, "rev-parse", "HEAD")
        if actual["submodules"][subdir] != expected:
            raise ValueError("Unexpected submodule revision: " + subdir)
        if git(source / subdir, "status", "--porcelain", "--untracked-files=no"):
            raise ValueError("Modified tracked submodule source: " + subdir)
    if git(source, "status", "--porcelain", "--untracked-files=no"):
        raise ValueError("Modified tracked Breeze source; use the pinned clean checkout")
    return actual


def cpu_cache(cache_path, source):
    values = {}
    for line in cache_path.read_text().splitlines():
        match = re.match(r"([^#/:][^:]*):[^=]+=(.*)", line)
        if match:
            values[match[1]] = match[2]
    for key in ("BREEZE_VULKAN", "BREEZE_CUDA", "GGML_VULKAN", "GGML_CUDA"):
        if values.get(key) != "OFF":
            raise ValueError(key + " must explicitly be OFF in CMakeCache.txt")
    if Path(values.get("CMAKE_HOME_DIRECTORY", "")).resolve() != source.resolve():
        raise ValueError("Build cache does not belong to the verified source checkout")
    return {key: value for key, value in values.items() if key in {
        "CMAKE_BUILD_TYPE", "CMAKE_C_COMPILER", "CMAKE_CXX_COMPILER",
        "CMAKE_GENERATOR", "GGML_NATIVE", "GGML_OPENMP", "BREEZE_VULKAN",
        "BREEZE_CUDA", "GGML_VULKAN", "GGML_CUDA",
    }}


def environment():
    result = {"platform": platform.platform(), "python": platform.python_version(),
              "logical_cpus": os.cpu_count(), "cpu_affinity": sorted(os.sched_getaffinity(0))}
    cpuinfo = Path("/proc/cpuinfo").read_text()
    result["cpu_model"] = next(
        (line.split(":", 1)[1].strip() for line in cpuinfo.splitlines()
         if line.startswith("model name")), "unknown"
    )
    for field, filename in {
        "cpu_quota": "/sys/fs/cgroup/cpu.max",
        "memory_limit_bytes": "/sys/fs/cgroup/memory.max",
        "memory_current_bytes": "/sys/fs/cgroup/memory.current",
    }.items():
        path = Path(filename)
        result[field] = path.read_text().strip() if path.exists() else None
    result["memory_host"] = {
        line.split(":", 1)[0]: line.split(":", 1)[1].strip()
        for line in Path("/proc/meminfo").read_text().splitlines()
        if line.startswith(("MemTotal:", "MemAvailable:", "SwapTotal:"))
    }
    return result


def disable_core_dumps():
    resource.setrlimit(resource.RLIMIT_CORE, (0, 0))


def run_measured(command, log_path, timeout_seconds):
    """wait4 measures this child, not cumulative unrelated build processes."""
    start = time.monotonic()
    timed_out = False
    interrupted = False
    with log_path.open("xb") as log:
        child = subprocess.Popen(command, stdout=log, stderr=subprocess.STDOUT,
                                 start_new_session=True, preexec_fn=disable_core_dumps)
        try:
            while True:
                pid, status, usage = os.wait4(child.pid, os.WNOHANG)
                if pid:
                    break
                if time.monotonic() - start >= timeout_seconds:
                    timed_out = True
                    os.killpg(child.pid, signal.SIGKILL)
                    _, status, usage = os.wait4(child.pid, 0)
                    break
                time.sleep(0.1)
        except KeyboardInterrupt:
            interrupted = True
            os.killpg(child.pid, signal.SIGKILL)
            _, status, usage = os.wait4(child.pid, 0)
        child.returncode = os.waitstatus_to_exitcode(status)
    return {
        "return_code": child.returncode, "timed_out": timed_out,
        "interrupted": interrupted, "wall_seconds": time.monotonic() - start,
        "cpu_user_seconds": usage.ru_utime, "cpu_system_seconds": usage.ru_stime,
        "peak_rss_kib": usage.ru_maxrss,
    }


def inspect_wav(path):
    """Measure actual mono PCM16 frames; do not infer pronunciation or completeness."""
    count = square_sum = clipped = nonzero = peak = 0
    with wave.open(str(path), "rb") as audio:
        rate, frames = audio.getframerate(), audio.getnframes()
        if (audio.getnchannels(), audio.getsampwidth(), audio.getcomptype(), rate) != (
                1, 2, "NONE", 24000):
            raise ValueError("Expected Breeze mono PCM16 at 24000 Hz")
        while chunk := audio.readframes(24000):
            samples = array("h")
            samples.frombytes(chunk)
            if sys.byteorder != "little":
                samples.byteswap()
            count += len(samples)
            square_sum += sum(x * x for x in samples)
            clipped += sum(abs(x) >= 32767 for x in samples)
            nonzero += sum(x != 0 for x in samples)
            peak = max(peak, max(abs(x) for x in samples))
    if count == 0 or count != frames:
        raise ValueError("Empty or truncated WAV payload")
    if nonzero == 0:
        raise ValueError("WAV contains only digital silence")
    duration = count / rate
    rms = math.sqrt(square_sum / count) / 32768
    return {
        "sha256": sha256(path), "size_bytes": path.stat().st_size,
        "sample_rate_hz": rate, "channels": 1, "sample_width_bits": 16,
        "sample_frames": count, "duration_seconds": duration,
        "within_60_to_240_seconds": 60 <= duration <= 240,
        "peak_dbfs": 20 * math.log10(peak / 32768),
        "rms_dbfs": 20 * math.log10(rms),
        "full_scale_sample_fraction": clipped / count,
    }


def assess(run, log, audio):
    if run["interrupted"]:
        return "interrupted"
    if run["timed_out"]:
        return "timeout"
    if run["return_code"] != 0:
        return "inference_failed"
    if not re.search(r"^backend: CPU, sample rate: 24000$", log, re.MULTILINE):
        return "cpu_backend_unconfirmed"
    if audio is None:
        return "invalid_audio"
    return "generated_needs_listening_review"


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source-dir", required=True, type=Path)
    parser.add_argument("--model", required=True, type=Path)
    parser.add_argument("--output-dir", required=True, type=Path)
    parser.add_argument("--case", choices=["smoke", "explanation", "story"], default="smoke")
    parser.add_argument("--timeout-seconds", type=float, default=600)
    args = parser.parse_args()
    if sys.platform != "linux":
        parser.error("This resource probe requires Linux wait4 and /proc")
    if not math.isfinite(args.timeout_seconds) or args.timeout_seconds <= 0:
        parser.error("Timeout must be a finite positive number")
    output = args.output_dir.resolve()
    if output.is_relative_to(REPOSITORY):
        parser.error("Keep generated media and raw benchmark output outside the repository")
    if output.exists():
        parser.error("Output directory already exists; choose a fresh run directory")
    output.mkdir(parents=True)
    lock = json.loads((HERE / "versions.json").read_text())
    report = {
        "schema_version": 1, "started_utc": datetime.now(timezone.utc).isoformat(),
        "case": args.case, "versions": lock, "environment": environment(),
        "status": "preflight_failed", "audio": None,
        "listening_review": {"status": "not_performed", "findings": None},
        "note": "A successful process and valid WAV do not establish text or voice quality.",
    }
    exit_code = 2
    try:
        source = args.source_dir.resolve()
        build = source / "build-cpu"
        binary = build / "breeze-cli"
        report["source_verified"] = verify_source(source, lock)
        report["cpu_build"] = cpu_cache(build / "CMakeCache.txt", source)
        report["model_sha256_verified"] = verify_model(args.model, lock)
        report["binary_sha256"] = sha256(binary)
        text = (HERE / "text" / (args.case + ".txt")).read_text().strip()
        report["input_text"] = text
        report["input_sha256"] = hashlib.sha256(text.encode()).hexdigest()
        command = [str(binary), str(args.model.resolve()), "--cpu", "--text", text,
                   "--instruction", lock["voice_instruction"], "--seed", str(lock["seed"]),
                   "--cfg-scale", str(lock["cfg_scale"]), "--split-chars", str(lock["split_chars"]),
                   "--max-new", str(lock["max_new_frames_per_piece"]), "--timings",
                   "--output", str(output / "narration.wav")]
        report["command"] = command
        report["timeout_seconds"] = args.timeout_seconds
        report["run"] = run_measured(command, output / "process.log", args.timeout_seconds)
        log = (output / "process.log").read_text(errors="replace")
        if (output / "narration.wav").exists():
            try:
                report["audio"] = inspect_wav(output / "narration.wav")
            except (OSError, ValueError, EOFError, wave.Error) as exc:
                report["audio_error"] = str(exc)
        report["status"] = assess(report["run"], log, report["audio"])
        if report["status"] == "generated_needs_listening_review":
            report["wall_seconds_per_audio_second"] = (
                report["run"]["wall_seconds"] / report["audio"]["duration_seconds"])
            # This exit code is mechanical success, never lesson approval.
            exit_code = 0
        else:
            exit_code = 1
    except (OSError, ValueError, subprocess.SubprocessError) as exc:
        report["error"] = str(exc)
    (output / "report.json").write_text(json.dumps(report, indent=2) + "\n")
    print(json.dumps({"status": report["status"], "report": str(output / "report.json")}))
    return exit_code


if __name__ == "__main__":
    raise SystemExit(main())
