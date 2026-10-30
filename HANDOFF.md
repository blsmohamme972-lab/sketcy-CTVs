# Worker handoff — third checkpoint (bounded CPU feasibility increment)

The user authorized only the next approximately 10% increment after `d58a734`
and asked for a saved checkpoint. This increment stops after a measured Breeze
TTS 2 CPU smoke test and reproducible test tooling. **The full narration/camera
milestone is not accepted.** The Android app remains at the previous approximately
20% implementation scope; this checkpoint adds CPU feasibility tooling and evidence.

## Start here

1. Read this file, [README.md](README.md), and [PLAN.md](PLAN.md).
2. Check current GitHub `main` and the local working tree before editing.
3. Read [docs/BREEZE_CPU.md](docs/BREEZE_CPU.md) for the measured result, exact
   versions, and open audio-quality gate, then [docs/VERIFICATION.md](docs/VERIFICATION.md).
4. Continue only within a newly authorized bounded increment.

Checkpoint history:

- First: `6f74243c0c8ef72ae8f50d4aad372d177317a441` — app/model foundation.
- Second: `d58a734b6c715aab5c36fcdd7cc8406492d36840` — playback timing core.
- Third: the commit introducing `tools/breeze/benchmark.py` and this handoff.
  Discover its SHA with `git log --oneline -- HANDOFF.md`.

Repository: `blsmohamme972-lab/sketcy-CTVs`; default branch: `main`.

## What this increment completed

- Built unchanged `HoppouAI/Breeze-TTS-2.cpp` commit
  `2904b9ad126c07363e8a6c9afa08f73e3309075b`, with pinned submodules and both
  Vulkan/CUDA disabled. Upstream CPU regression test passed.
- Downloaded the **standard Q8_0** from Hugging Face model revision
  `81b22bad9f05b99970e30c5ee5e4bbc52fedf2f8`; verified all 3,568,844,480 bytes
  against SHA-256 `a02bcc4b69b0601032727f8040c4942149b1b73aa0f69022fe5aaa6a8f0ef879`.
- Ran one 29-word nonmedical English smoke test with `--cpu`, a synthetic voice
  instruction, and seed 42. Exit 0; actual output 12.56 seconds of mono 24 kHz
  PCM16. End-to-end process time 174.906905 seconds; peak RSS 4,327,580 KiB
  (4.13 GiB). No crash, timeout, or out-of-memory failure occurred.
- Added [a Linux benchmark runner and setup guide](tools/breeze/README.md),
  exact version lock, and separate neutral explanation/story scripts for later
  full-track evaluation. The full-track scripts have not been generated.
- Added 12 Python tests for measurement/failure handling. All pass. All 21
  existing Kotlin JVM tests also pass again.
- Extended ignore rules for weights, generated audio/video, PDFs, saved voices,
  and core dumps. None of those assets were committed.

The text-only [benchmark report](docs/benchmarks/breeze-cpu-smoke-2026-10-30.json)
records the actual run. The WAV is supplied separately for listening review;
its SHA-256 is `6dd3282fa17e6322b39a38cef526d633aca0935d50b5df4ccf78f7369e168f4d`.
Do not depend on old `/tmp` paths surviving. Reproduce from the pinned inputs if
the separately supplied clip is unavailable.

## Audio acceptance is still open

CPU generation is demonstrated only for one short take on this Linux VM.
Automatic WAV checks and ffprobe agree on format/duration; the measured peak
is -7.64 dBFS, RMS -22.28 dBFS, and full-scale sample fraction zero.
**No listening review was possible in this session.** These measurements do not
establish pronunciation, completeness, subjective clarity, or voice consistency.
Do not relabel them as a listening pass or approval of production narration.

No complete 1–4-minute explanation/story pair, word/segment alignment, Media3
adapter, image viewport, or synchronized player was delivered. No alternate
TTS model, GPU service, or placeholder audio was used. The short smoke clip is a
technical probe, not a lesson track that satisfies the 1–4-minute requirement.

## Existing app and timing core

- Kotlin/Compose Android 8+ shell with Library, Review, and Settings empty states.
- Source-backed fact types, 1–4-minute declared track durations, image regions,
  and separate explanation/story tracks.
- Deterministic captions, segment/symbol selection, camera interpolation,
  reduced motion, seeking, and narration switching by shared fact IDs.
- Metadata checks for timing, references, IDs, and audio declarations.

Read [docs/PLAYBACK_TIMING.md](docs/PLAYBACK_TIMING.md) before any player
integration. The Kotlin and Android source files were not changed in this
increment. Android compilation/lint results belong to the previous checkpoint;
only the 21 Kotlin tests were rerun here. No emulator or physical-device validation
has been performed. No installable APK is delivered.

The package format is still a draft. JSON/ZIP import, checksum and measured-media
validation in Android, Room, DataStore, FSRS, backup/restore, Symbol Explorer,
and the full lesson production toolkit remain deferred. There is still no user
pilot PDF/text, medical fact inventory, or generated lesson ZIP.

## Recommended next bounded increment

1. Listen to the real smoke WAV against `tools/breeze/text/smoke.txt` and record
   exact omissions/substitutions, pronunciation, noise, pacing, and ending.
   If it fails quality review, document the problem and pause the audio milestone.
2. If acceptable, use the pinned standard Q8_0 CPU setup to generate the neutral
   explanation/story scripts. Verify a consistent synthetic voice, every sentence,
   and actual 60–240-second duration for **each** track. The same instruction and
   seed alone do not prove a consistent voice between tracks.
3. Measure actual segments and align captions, highlights, and camera cues.
   If that fits the next increment, connect Media3's content position to
   `PlaybackTimeline.frameAt`; see the timing integration guide.
4. Test seek, pause/resume, playback speed, narration switching, reduced motion,
   and rotation on an emulator. Record physical-device checks separately.

If CPU inference fails on a retry, report the measured failure and pause the
milestone. Do not substitute another model, quantization, GPU service, or
placeholder audio. This checkpoint does not authorize unlimited optimization,
unrelated features, or the next milestone.

## Working conventions and setup

Use English and work alone. Medical content must come only from the user's
supplied PDFs/text; preserve every fact and its source reference. Sketchy and
Picmonic are visual-teaching inspiration only. Keep review history separate from
lesson packages. Keep weights, generated media, PDFs, SDKs, and credentials out
of GitHub. Update this file, README, and verification notes at each checkpoint.

Android build requirements remain JDK 17 or 21, Gradle 8.9, SDK platform 35, and
Build Tools 34.0.0. The current JVM tests used OpenJDK 17.0.20. This environment
had no configured Android SDK or adb, so Android compilation/device checks were
not rerun. Never commit local SDK paths.

The CPU probe used GCC 13.3.0, CMake 3.31.6, Python 3.12.14, a VM reporting Xeon
Platinum 8573C, an 8-CPU quota, and an 8 GiB memory limit. Reproduction commands
and exact resource definitions are in `tools/breeze/README.md`. Preserve the
managed environment's proxy/TLS configuration when downloading. Use the current
GitHub connection and verify the saved commit/files; never reuse old credentials.
