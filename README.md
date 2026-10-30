# Sketcy CTVS

A personal Android study app for illustrated lessons made only from the learner's
own PDFs and text. Lessons and review are planned to work offline.

**Status: initial foundation, approximately 10% of the planned implementation.**
This is a scope estimate, not a measured percentage of the final code. Development
stops at this checkpoint as requested. This is not yet a usable study app.

## Included in this checkpoint

- Android 8+ Kotlin/Jetpack Compose project with a pinned Gradle wrapper.
- Library, Review, and Settings tabs with honest empty states, system dark mode,
  scrollable content, and selected-tab restoration after activity recreation.
- A small JVM lesson-model module: source-backed facts, separate explanation/story
  tracks, 1–4-minute declared durations, and normalized image regions.
- Tests for model boundaries, source requirements, and narration selection.
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

## Deliberately deferred

ZIP parsing/import, Room storage, DataStore preferences, Media3 playback,
captions, camera animation, Symbol Explorer, FSRS reviews, backup/restore,
the Python production toolkit, GPT illustrations, and Breeze TTS are not
implemented. There are no sample medical claims, lesson assets, or placeholder
audio. The package contract is a draft; constructor checks do not validate media
files, prove factual coverage, or secure ZIP imports.

See [verification notes](docs/VERIFICATION.md) for the checks performed and
remaining device validation. Continue only when another increment is requested.
