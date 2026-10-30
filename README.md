# Sketcy CTVS

An Android study app for original illustrated lessons made from the learner's own
PDFs and text. Kotlin, Jetpack Compose, Room, DataStore and Media3; Android 8+
(API 26). Imports, playback and spaced review use local files and on-device
storage. No account, server, analytics or Internet permission is required.

**Status: version 0.2.0 engineering checkpoint.** The user asked to proceed with
all remaining work after the bounded CPU feasibility checkpoint `c5eea4d`.
The app now implements the complete import → listen/explore → review → backup
path. Read [verification](docs/VERIFICATION.md) for the actual checks and limits;
implementation does not by itself constitute device or medical acceptance.
**Build and CI checks pass. Emulator app validation remains unverified:** the
final software-emulator APK installation timed out after 600 seconds, so none of
the four compiled instrumented tests ran. No physical-device pass is claimed.

No medical PDF/text has been supplied. The separately delivered **Lantern Library**
package is an original nonmedical technical demo, with actual Breeze TTS 2 CPU
narration and original artwork. It is not the requested medical pilot. Human
listening review and physical-device acceptance are still required.

The real Explanation track measures **86.88 seconds** and Story **91.04 seconds**
at normal speed. Eight separate CPU generation processes took 57.64 minutes in
total, with peak process memory 4.23 GiB; voice encoding is measured separately.
These runs overlapped other authoring work, so they are not isolated performance
benchmarks. The delivered APK is 13,408,761 bytes and contains no narration or
model weights; import the separate validated ZIP to play the demonstration.

## Included

- Searchable library, topic and bookmark filters, lesson objectives, source
  passages, track completion and saved playback positions.
- Strict versioned lesson ZIP import: bounded extraction, path/link/duplicate
  protection, checksums, exact source quotes, fact coverage, PNG decoding, and
  actual 60–240-second WAV verification for each explanation/story track.
- Media3 playback with pause, seeking, speed, audio focus, headphone-disconnect
  handling, foreground lifecycle behavior and narration switching by shared facts.
- Camera movement, captions and symbol highlights driven by Media3's audio
  position through `PlaybackTimeline`; pinch/drag exploration, reduced motion,
  landscape fullscreen and Symbol Explorer.
- Mixed image recall, occlusion, tap-symbol and multiple-choice review. Answers
  stay concealed until reveal/submission. Incorrect objective answers rate Again.
- Deterministic FSRS v6 scheduling for each fact, 90% default retention,
  reference-tested learning/relearning transitions and persistent review history.
- Transactional lesson updates: unchanged facts retain scheduling; changed facts
  restart learning. Audio/fact changes invalidate only affected playback progress.
- Room storage, DataStore settings and full export/restore through Android's file
  picker, with recoverable settings writes and orphan-file cleanup.
- A Linux authoring toolkit for supplied-source text/OCR extraction, fact-linked
  Breeze CPU segments, measured assembly and validated ZIP packaging.
- Pinned GitHub Actions build/test/lint automation producing an installable debug
  APK. No models, generated media, user PDFs or credentials are stored in Git.

## Install and try

Download [Sketcy-CTVS-0.2.0.apk](https://github.com/blsmohamme972-lab/sketcy-CTVs/releases/download/v0.2.0-android-preview/Sketcy-CTVS-0.2.0.apk)
in a browser, including Chrome. The public APK is 13,408,761 bytes and is also
listed on the [Android preview release](https://github.com/blsmohamme972-lab/sketcy-CTVs/releases/tag/v0.2.0-android-preview).
Use Android 8 or later; allow installation from your chosen browser/file manager
when Android asks, install it, then open **Sketcy CTVS**. This is a debug-signed
personal-testing build, not a Play Store release.

The public APK comes from the successful CI build of application commit
`b0f7cc6`. Its signing certificate differs from the earlier chat-delivered local
APK. The direct download, SHA-256, package structure and signature were verified;
this does not establish successful installation on a physical device. See
[artifact identities](docs/VERIFICATION.md#public-browser-download) before mixing
builds.

1. Save the separately supplied `sketcy-lantern-library-v1.zip` on the device.
2. Open **Library → Import** and choose that ZIP. Keep it zipped.
3. Open **The Lantern Library → Start lesson**. Try both narration modes,
   seeking, speed, captions and “Still scene”. Rotate and use Fullscreen as desired.
4. Open **Explore symbols**, then try the **Review** tab.
5. Use **Settings → Export backup** before uninstalling or moving devices.

The app starts with an empty library. It does not download lessons automatically.
A freshly generated CI debug signing key may differ from a previous build; export
a backup before uninstalling a differently signed build and restore afterward.
Use your own persistent release signing key for long-term distribution; keep it
and its passwords out of the repository.

See [installation and device checks](docs/INSTALLATION.md) for adb commands and the
remaining physical playback checklist. Review flags on technical material remain
false until a real reviewer records the required checks.

## Build and verify

Use a **complete JDK 17** (including `javac` and `jlink`), Gradle 8.9 (wrapper),
Android SDK platform 35 and Build Tools 34.0.0. Set `ANDROID_HOME`, or let Android
Studio create a local, untracked `local.properties`. Do not commit local paths.

```sh
./gradlew :lesson-model:test :app:assembleDebug :app:assembleDebugAndroidTest :app:lintDebug --no-daemon
python3 -m unittest discover -s tools/breeze -p 'test_*.py' -v
python3 -m unittest discover -s tools/production -p 'test_*.py' -v
```

The APK is produced at `app/build/outputs/apk/debug/app-debug.apk`. Dependencies
need network access on the first build. Gradle uses one worker and an in-process
Kotlin compiler to keep authoring/build memory pressure manageable.

Instrumented tests need an Android device/emulator **and the real CPU-generated
technical demo ZIP**, which is deliberately not committed. Building the test APK
is not running device tests. See [VERIFICATION.md](docs/VERIFICATION.md) for exact
setup, results and what remains unverified.

## Create a lesson from your material

Start with [the production guide](tools/production/README.md). Extract the supplied
PDF/text, inventory every fact with exact source references, review coverage,
write separate explanation/story scripts, generate original art and both Breeze
CPU tracks, verify them by listening, and package using the same validator as the
Android importer. Do not use Sketchy, Picmonic or other websites as medical sources.

The pinned standard Q8_0 probe succeeded on this Linux CPU environment. Full code,
model revisions, resource measurements and audio-quality limits are in
[BREEZE_CPU.md](docs/BREEZE_CPU.md). Breeze runs on the authoring computer; weights
are not downloaded or executed on Android. Failed CPU inference or failed audio
quality pauses audio production. No alternate TTS/model/GPU or placeholder audio
is an allowed fallback.

## Continue from this checkpoint

Read [HANDOFF.md](HANDOFF.md), [PLAN.md](PLAN.md), and
[VERIFICATION.md](docs/VERIFICATION.md). The open acceptance work is the first
source-backed medical pilot, human listening review and physical Android checks.
Source preservation, medical completeness and audio quality must not be claimed
from automated timing, checksum or scheduling tests.

Contracts and provenance:
[lesson package v1](docs/LESSON_PACKAGE.md) ·
[playback timing](docs/PLAYBACK_TIMING.md) ·
[screen guide](docs/SCREENS.md) ·
[third-party notices](THIRD_PARTY.md).
