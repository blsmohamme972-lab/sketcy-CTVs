# Worker handoff — second checkpoint (approximately 20%)

The user requested one additional approximately 10% increment and a saved handoff.
This checkpoint stops after the playback synchronization core. The percentage is
a scope estimate, not a measurement of final code size or milestone acceptance.
Continue only within the next increment requested by the user.

## Start here

1. Read this file, [README.md](README.md), and [PLAN.md](PLAN.md).
2. Check the current GitHub `main` and local working tree before editing.
3. Use [docs/VERIFICATION.md](docs/VERIFICATION.md) for the tested setup and commands.

The first checkpoint was saved as `6f74243c0c8ef72ae8f50d4aad372d177317a441`.
The second checkpoint's Git commit is the commit introducing this handoff and
`PlaybackTimeline.kt`; discover its SHA with `git log --oneline -- HANDOFF.md`.
Both checkpoints belong to `blsmohamme972-lab/sketcy-CTVs`, default branch `main`.

## What works

- Kotlin/Compose Android shell with Library, Review, and Settings empty states.
- Source-backed fact types, 1–4-minute declared audio durations, image regions,
  and separate explanation/story tracks.
- Deterministic captions, segment/symbol selection, camera interpolation,
  reduced-motion behavior, and seeks from any audio content position.
- Narration switching by shared fact IDs, including reordered story facts.
- Metadata checks for invalid timing, missing/unknown facts, unknown symbols,
  duplicate segment/caption IDs, and mismatched audio declarations.

The pure Kotlin implementation is in
`lesson-model/src/main/kotlin/com/sketcy/ctvs/lesson/PlaybackTimeline.kt`.
Tests are in `lesson-model/src/test/kotlin/com/sketcy/ctvs/lesson/`.
Read [docs/PLAYBACK_TIMING.md](docs/PLAYBACK_TIMING.md) before integrating it.
Verification: all 21 JVM tests passed; Android compilation passed; lint reported
0 errors and the same 3 warnings as the first checkpoint. Detailed results and
the command to reproduce them are in [docs/VERIFICATION.md](docs/VERIFICATION.md).

## Current limits

The app still shows the original empty screens. No actual audio is generated or
played. Breeze-TTS-2.cpp CPU feasibility, pronunciation, generation time, memory
use, and voice consistency have not been tested. No Media3 adapter or camera
renderer exists. The timing tests use synthetic metadata and text, with no audio
files or medical claims. Passing those tests does not validate real playback.

The package format remains a draft. There is no JSON codec, ZIP importer, asset
checksum verification, measured audio-duration validation, Room database,
DataStore preference storage, FSRS scheduling, backup/restore, or lesson toolkit.
There is no pilot PDF/text from the user and no generated lesson ZIP. Emulator
and physical-device validation remain outstanding. No installable APK is delivered.

## Recommended next bounded increment

Continue the plan's CPU narration and synchronized camera proof of concept:

1. Test the CPU build of Breeze-TTS-2.cpp with its standard Q8_0 model. Record the
   exact upstream commit, model identity/checksum, build commands, CPU/RAM,
   generation time, measured duration, and pronunciation/completeness findings.
   Use neutral nonmedical text for a technical feasibility test. Medical lessons
   require the user's supplied PDF/text and traceable fact inventory.
2. If the CPU test succeeds, connect real audio to Media3 and drive a small image
   viewport, caption display, and highlights from `PlaybackTimeline.frameAt`.
   Measure and align actual narration before claiming a synchronized proof.
3. Test seek, pause/resume, speed changes, narration switching, reduced motion,
   and rotation on an emulator/device. Record remaining physical-device checks.

If CPU narration fails, report the measured blocker and pause the audio milestone.
The user requires Breeze TTS 2 on CPU; another voice/model, GPU service, or
placeholder audio is not an authorized substitute. Keep model weights, generated
audio, user PDFs, lesson packages, SDKs, and credentials out of GitHub.

## Working conventions

Use English and work alone, as requested in the plan. Respect the bounded
increment and stop after saving a verified checkpoint. Preserve every medical
fact from supplied sources and add no unsupported medical claims. Keep review
history separate from lesson packages. Update this handoff, README progress, and
verification notes whenever another increment is completed.

JDK 17 or 21, Gradle 8.9, SDK platform 35, and Build Tools 34.0.0 are the current
build setup. Android Studio can create `local.properties`; never commit local
SDK paths. In managed cloud environments, read the environment's networking
instructions before downloads. The Gradle wrapper is committed and checksum-pinned.

GitHub write access initially returned HTTP 403, but was corrected and verified
in this session. Use the currently configured connection; never assume old
credentials remain valid or include credentials in the repository.
