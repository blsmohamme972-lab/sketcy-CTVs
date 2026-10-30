# Breeze CPU feasibility tools

This Linux-only, Python-standard-library probe runs **Breeze TTS 2 on CPU with
the standard Q8_0 model**. It is not the lesson production toolkit or an Android
TTS implementation. Its input is original, nonmedical test text; no learner PDF
or medical facts are included. Results and the checkpoint decision belong in
[docs/BREEZE_CPU.md](../../docs/BREEZE_CPU.md).

## Pinned inputs

[versions.json](versions.json) records the source commit, ggml and shine submodule
commits, model repository revision, byte count, SHA-256, voice instruction, seed,
and generation settings. The model digest and byte count were obtained from the
official model repository's file metadata. The runner verifies the actual bytes
before invoking inference. The `-dd` models and other quantizations are excluded.

The preconverted GGUF includes the codec tensors; the CLI loads this single file.
The separate upstream `audio_tokenizer/` directory is needed when **converting**
the original weights, which this workflow does not do. See the pinned
[converter documentation](https://github.com/HoppouAI/Breeze-TTS-2.cpp/blob/2904b9ad126c07363e8a6c9afa08f73e3309075b/docs/models.md)
and [runtime loader](https://github.com/HoppouAI/Breeze-TTS-2.cpp/blob/2904b9ad126c07363e8a6c9afa08f73e3309075b/src/gguf_loader.cpp).

## Reproduce setup

Use a Linux x86-64 machine with a C++17 compiler, Make, Git, Python 3.9+, curl, and
CMake 3.19+ (3.31.6 was used for this checkpoint). All paths below are outside the
repository. Keep the configured proxy and TLS verification when downloading.
Do not check in the checkout, toolchain, model, raw logs, voices, or generated WAVs.

```sh
git clone https://github.com/HoppouAI/Breeze-TTS-2.cpp.git /tmp/sketcy-breeze-cpu-src
git -C /tmp/sketcy-breeze-cpu-src checkout --detach 2904b9ad126c07363e8a6c9afa08f73e3309075b
git -C /tmp/sketcy-breeze-cpu-src submodule update --init --recursive

cmake -S /tmp/sketcy-breeze-cpu-src -B /tmp/sketcy-breeze-cpu-src/build-cpu \
  -DCMAKE_BUILD_TYPE=Release \
  -DBREEZE_VULKAN=OFF -DBREEZE_CUDA=OFF \
  -DBREEZE_BUILD_SERVER=OFF -DBREEZE_BUILD_SHARED=OFF -DBREEZE_MP3=OFF \
  -DBREEZE_BUILD_TESTS=ON
cmake --build /tmp/sketcy-breeze-cpu-src/build-cpu \
  --target breeze-cli breeze-test-depth -j 4
ctest --test-dir /tmp/sketcy-breeze-cpu-src/build-cpu \
  -R '^depth-replay-cpu$' --output-on-failure

mkdir -p /tmp/sketcy-breeze-model
curl --fail --location --retry 2 \
  'https://huggingface.co/HoppouAI/Breeze-TTS-2.cpp/resolve/81b22bad9f05b99970e30c5ee5e4bbc52fedf2f8/breeze-tts-2-q8_0.gguf' \
  --output /tmp/sketcy-breeze-model/breeze-tts-2-q8_0.gguf.partial
```

Verify the download, then rename it. These are Python commands to avoid
shell-dependent checksum formatting:

```sh
python3 - <<'PY'
import hashlib
from pathlib import Path
path = Path('/tmp/sketcy-breeze-model/breeze-tts-2-q8_0.gguf.partial')
if path.stat().st_size != 3568844480:
    raise SystemExit('Incomplete or unexpected model file')
digest = hashlib.sha256()
with path.open('rb') as source:
    for chunk in iter(lambda: source.read(8 * 1024 * 1024), b''):
        digest.update(chunk)
if digest.hexdigest() != 'a02bcc4b69b0601032727f8040c4942149b1b73aa0f69022fe5aaa6a8f0ef879':
    raise SystemExit('Model checksum mismatch')
path.rename(path.with_suffix(''))
PY
```

## Run and interpret

From the Sketcy CTVS repository:

```sh
python3 -m unittest discover -s tools/breeze -p 'test_*.py' -v
python3 tools/breeze/benchmark.py \
  --source-dir /tmp/sketcy-breeze-cpu-src \
  --model /tmp/sketcy-breeze-model/breeze-tts-2-q8_0.gguf \
  --case smoke --timeout-seconds 600 \
  --output-dir /tmp/sketcy-breeze-smoke-01
```

Use a new output directory for each attempt. The runner rejects existing
directories and any destination inside this repository. It checks a clean pinned
source checkout, both submodules, the CPU-only CMake configuration, model size,
and full model checksum. It records the CLI binary hash and forces `--cpu`.
Run from a fresh build directory when changing any toolchain setting.

`report.json` contains the input, exact arguments, hardware limits, per-process
wall/CPU time and peak RSS, exit status, and measured audio properties. Wall time
includes model loading and process startup; it is not a steady-state service
throughput measurement. On Linux, `wait4.ru_maxrss` is recorded in KiB and applies
to that child alone. Peak RSS does not include filesystem cache or the Python
parent. Source/model verification time is excluded from the timed process.
The upstream stage breakdown remains in `process.log`.

Possible states include `preflight_failed`, `inference_failed`, `timeout`,
`interrupted`, `cpu_backend_unconfirmed`, `invalid_audio`, and
`generated_needs_listening_review`. Exit code 0 means only that the process
succeeded, reported the CPU backend, and produced a nonempty, nonsilent mono
24 kHz PCM16 WAV. No state automatically approves audio for lessons. A crash,
timeout, or nonzero exit is a failure even if a partial file exists.

Only after the smoke test succeeds, try `--case explanation` and `--case story`
with fresh output directories and an explicit runtime budget. Both scripts
describe the same invented objects in different ways. Their lengths are
**unverified until generated**. Each complete track must measure 60–240 seconds
without padding, truncation, or speed manipulation to force acceptance.

Listen against every sentence and record omissions, substitutions, pronunciation,
noise, abrupt joins, pacing, and voice consistency within and between tracks.
Record whether an ending was natural or hit a frame limit. The upstream limit
of 750 frames is 60 seconds **per generated piece**, not a guarantee that a full
script fits. Automatic splitting at approximately 600 characters reuses a
synthetic voice anchor; this does not prove cross-track voice consistency.
Peak/RMS/full-scale samples are signal measurements, not listening results.

If CPU inference fails, stop the audio milestone and record the reproducible
failure. Do not substitute a model, change quantization, use a GPU, or add
placeholder narration. A future authorized retry may diagnose the same pinned
CPU implementation or deliberately evaluate a documented upstream fix.

## Test scope

The Python tests exercise WAV validation, wrong/incomplete model rejection,
CPU-only build enforcement, process timeout/exit handling, and the distinction
between generated audio and reviewed narration. Tiny temporary PCM byte fixtures
are parser tests only. They are not lesson audio and are never shipped in the app.
The upstream CTest uses synthetic tensors; it is not a Q8_0 model inference test.
Neither test suite validates Android, Media3, pronunciation, or synchronized
camera movement.
