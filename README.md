# Sketcy CTVS

A personal Android study app for illustrated lessons made only from the learner's
own PDFs and text. Lessons and review are planned to work offline.

**Status: third checkpoint — bounded Breeze TTS 2 CPU feasibility increment.**
One short CPU narration run succeeded; full-track audio acceptance and Media3
integration are still pending. The Android implementation remains at the prior
approximately 20% scope; no automatic increase to 30% is claimed. Development
stops at this saved checkpoint as requested. This is not yet a usable study app.

## Included in this checkpoint

- Android 8+ Kotlin/Jetpack Compose project with a pinned Gradle wrapper.
- Library, Review, and Settings tabs with honest empty states, system dark mode,
  scrollable content, and selected-tab restoration after activity recreation.
- A small JVM lesson-model module: source-backed facts, separate explanation/story
  tracks, 1–4-minute declared durations, and normalized image regions.
- Tests for model boundaries, source requirements, and narration selection.
- A deterministic playback timeline for captions, symbol highlighting, linear or
  eased camera movement, reduced motion, and seeking between narration modes by
  shared fact IDs. Both modes must cover the part's declared fact inventory.
- A [worker handoff](HANDOFF.md) and [timing integration guide](docs/PLAYBACK_TIMING.md).
- A [pinned CPU narration probe](tools/breeze/README.md), original nonmedical
  smoke/explanation/story text, model checksum validation, CPU-only checks,
  timeout/failure recording, measured WAV analysis, and 12 Python tests.
- [Actual CPU benchmark evidence](docs/BREEZE_CPU.md): the standard Q8_0 model
  produced a 12.56-second WAV in 174.91 seconds, using 4.13 GiB peak process RSS.
  Listening review, full 1–4-minute tracks, and voice consistency are unverified.
- [Full project plan](PLAN.md), [screen direction](docs/SCREENS.md), and a
  [draft package contract](docs/LESSON_PACKAGE.md).

## Run locally

Use Android Studio Ladybug or newer, JDK 17 or 21, Android SDK platform 35,
and Android SDK Build Tools 34.0.0. Open this repository as a Gradle project and
let Android Studio create `local.properties`, or set `ANDROID_HOME` to your SDK.
Dependencies require network access on the first build.

```sh
./gradlew :lesson-model:test :app:compileDebugKotlin :app:lintDebug
```

Choose the `app` run configuration and an Android 8+ device/emulator to explore
the shell. On Windows, use `gradlew.bat`. Dependency versions are pinned in the
Gradle files; no local SDK paths or credentials belong in Git.

The CPU feasibility tool runs separately on Linux, outside Android. Start with
[its setup guide](tools/breeze/README.md); download weights and generate media
outside this repository. Its lightweight tests need only Python:

```sh
python3 -m unittest discover -s tools/breeze -p 'test_*.py' -v
```

The 21 Kotlin JVM tests and 12 Python tooling tests passed in this increment.
Android compilation/lint passed at `d58a734` and were not rerun here. No emulator
or physical-device validation has been performed.

## Deliberately deferred

ZIP parsing/import, Room storage, DataStore preferences, Media3 playback,
caption rendering, camera rendering, Symbol Explorer, FSRS reviews, backup/restore,
the full Python lesson production toolkit, and GPT illustrations are not
implemented. Breeze CPU generation is demonstrated by one short technical probe,
not by a completed lesson or a reviewed explanation/story pair. The timing core
is tested independently; the app still displays its initial empty screens. There
are no sample medical claims, bundled lesson assets, or placeholder audio. The
package contract is a draft; constructor checks do not validate media files,
prove factual coverage, or secure ZIP imports.

See [verification notes](docs/VERIFICATION.md) for the checks performed and
remaining device validation. The next worker should start with [HANDOFF.md](HANDOFF.md)
and continue only within the next requested increment.
