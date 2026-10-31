# Sketcy CTVS

An Android study app for original illustrated lessons made from the learner's own
PDFs and text. Kotlin, Jetpack Compose, Room, DataStore and Media3; Android 8+
(API 26). Imports, playback and spaced review use local files and on-device
storage. No account, server, analytics or Internet permission is required.

**Current authoring flow: one complete image per lesson.** Generate the whole
scene in one image-generation call, with its background, characters and props
together. Import it with `node studio/agent.mjs new --image /private/lesson.png
--title "Lesson" --out /private/lesson.sketcy-studio.json`. Studio keeps the
original canvas and supports fact hotspots, captions and camera movement over
that image. The measured production bridge packages one scene as one lesson
without requiring a layer export. See [the single-image workflow](studio/README.md).

**Previous media delivery: two complete Studio-authored demonstration packages.**
The assistant uses Studio to make lessons; the student app has no authoring UI.
Schema 2 adds independent transparent objects, gentle per-track motion and
explicit externally sourced review demonstrations. Camera, captions, highlights
and objects follow Media3's audio position, including seeks and Still scene.

| Lesson | Explanation | Story | Independent objects | Facts |
| --- | ---: | ---: | ---: | ---: |
| CABG — The Bypass Mountain | 107.20 s | 106.80 s | 7 | 6 |
| Surgical aortic valve replacement — The Gatekeeper Courtyard | 111.84 s | 107.92 s | 6 | 6 |


Both examples contain original layered artwork and four distinct, measured
Breeze TTS 2 Q8_0 CPU tracks. The two ZIPs, separate **Sketcy Preview** APK,
illustrated PDF guide and editable Studio projects were delivered outside Git.
Use the new preview app for these files; the older 0.2 importer reads schema 1.
The preview installs alongside the older app with a separate library.

Public NHS/NHLBI sources were authorized for these testing examples. They retain
real attribution and an `EXTERNAL_REVIEW` label. They cover twelve selected
introductory facts, not entire articles. **Human listening, clinical/source
approval and Android device acceptance remain open.** No claim is made that
all ten proposed demonstrations are complete. See [the handoff](HANDOFF.md),
[schema 2](docs/LESSON_PACKAGE_V2.md), [authoring](studio/README.md) and
[verification](docs/VERIFICATION.md).

### Try the two new examples

1. Install the separately supplied `Sketcy-Preview-0.3.0.apk` on Android 8+.
2. Open **Sketcy Preview → Library → Import** and select
   `01-CABG-Bypass-Mountain.zip`; repeat for `02-Aortic-Valve-Gatekeepers.zip`.
   Keep both ZIPs intact. The APK contains no bundled lesson media or model.
3. Play Explanation and Story, seek, change speed, switch by shared fact, and
   compare moving objects with **Still scene**. Explore symbols and their sources.
4. Try Review and export a backup before removing or changing the app.

**Android baseline: version 0.2.0 engineering checkpoint.** The user asked to proceed with
all remaining work after the bounded CPU feasibility checkpoint `c5eea4d`.
The app now implements the complete import → listen/explore → review → backup
path. Read [verification](docs/VERIFICATION.md) for the actual checks and limits;
implementation does not by itself constitute device or medical acceptance.
**The recorded Android build and CI checks passed. Emulator app validation remains unverified:** the
final software-emulator APK installation timed out after 600 seconds, so none of
the four compiled instrumented tests ran. No physical-device pass is claimed.

No medical PDF/text has been supplied. The separately delivered **Lantern Library**
package is an original nonmedical technical demo, with actual Breeze TTS 2 CPU
narration and original artwork. It is not the requested medical pilot. Human
listening review and physical-device acceptance are still required.
The user later authorized public medical sources for a separate cardiac testing
demonstration. These use the explicit schema-2 `EXTERNAL_REVIEW` policy and a visible review
label. The exception does not make them learner-supplied or relax `USER_SOURCE`
review requirements. The older v1 importer cannot read v2 packages.

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
- Internal Sketcy Studio: agent CLI, vector editing, real transparent image
  layers, portable project files, two-track previews, deterministic object
  keyframes and production handoff exports.
- Pinned GitHub Actions build/test/lint automation producing an installable debug
  APK. No models, generated media, user PDFs or credentials are stored in Git.

## Internal illustration and composition

[Sketcy Studio](studio/README.md) gives the assistant a repeatable way to build
lesson artwork inside this repository. Its CLI creates and edits private
projects, validates source/fact links, renders the scene or a requested frame,
and exports a background plus separate transparent object PNGs. The optional
local browser workspace provides drawing tools, layers, properties and a
narration timeline. Students receive only the completed lesson package.

The original **Lantern Workshop** vector example verifies the authoring tool.
It has no narration and is distinct from the earlier **Lantern Library** audio
demo. Actual WAV imports drive Studio preview from the media clock; silent
previews are labelled. Image generation and pinned Breeze CPU synthesis remain
external authoring steps, with their real outputs imported into Studio.

The production export retains exact source references and false review flags,
writes a real scene PNG, and supplies separate explanation/story script inputs.
It is a draft handoff, not an Android lesson ZIP. The measured production bridge
combines that handoff and the verified Breeze ledger into a single-image lesson
ZIP. A PNG layer export is optional for independently moving objects; the two
previously delivered examples use that layered path. Schema 1 remains supported,
and external-review lessons retain schema 2 with either artwork format.

Start with [agent instructions](studio/AGENTS.md),
[drawing rules](docs/ART_DIRECTION.md), and [format details](docs/STUDIO_FORMAT.md).

## Historical 0.2 installation and Lantern Library demo

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
./gradlew :lesson-model:test :app:assembleDebug :app:assembleDemoPreview :app:assembleDebugAndroidTest :app:lintDebug --no-daemon
python3 -m unittest discover -s tools/breeze -p 'test_*.py' -v
python3 -m unittest discover -s tools/production -p 'test_*.py' -v
```

The standard APK is `app/build/outputs/apk/debug/app-debug.apk`; the separate
preview is `app/build/outputs/apk/demoPreview/app-demoPreview.apk`. Dependencies
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
[VERIFICATION.md](docs/VERIFICATION.md). The next authoring milestone is the
measured Breeze ledger bridge and versioned Android layer playback; see
[STUDIO_PLAN.md](docs/STUDIO_PLAN.md). The open acceptance work is the first
source-backed medical pilot, human listening review and physical Android checks.
Source preservation, medical completeness and audio quality must not be claimed
from automated timing, checksum or scheduling tests.

Contracts and provenance:
[lesson package v1](docs/LESSON_PACKAGE.md) ·
[playback timing](docs/PLAYBACK_TIMING.md) ·
[screen guide](docs/SCREENS.md) ·
[third-party notices](THIRD_PARTY.md).
