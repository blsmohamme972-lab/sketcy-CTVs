# Version 0.2.0 verification

Date: 2026-10-30. This checkpoint extends the bounded CPU probe at `c5eea4d`
following the user's instruction to proceed with the remaining work. Results
below distinguish pure tests, Android compilation, actual runtime checks and
human acceptance. No user medical PDF/text was supplied.

## Completed automated checks

| Check | Observed result and scope |
| --- | --- |
| Kotlin JVM unit tests | **38 passed**, 0 failures/errors/skipped: 21 foundation/timeline tests, 6 FSRS tests and 11 package/archive tests |
| FSRS conformance | 24 independently generated steps from pinned canonical FSRS v6 Python source match state, difficulty, stability and due times; learning/relearning, all ratings and retention settings covered |
| Python benchmark tools | **12 passed**; measurement, invalid model/build/audio, child failure and timeout handling |
| Python production tools | **6 passed**; original source preservation, strict JSON, review gates, neutral demo, CPU failure and model/content mismatch |
| Android app | `assembleDebug` passed; application ID `com.sketcy.ctvs`, version `0.2.0` / code 2, minSdk 26, targetSdk 35 |
| Instrumented test APK | `assembleDebugAndroidTest` passed; this is compilation, separate from test execution |
| Android lint | **0 errors, 14 warnings**: 13 newer-dependency advisories and KaptUsageInsteadOfKsp |
| APK signature | `apksigner verify` passed, v2 signature, local Android Debug certificate; not owner-controlled release signing |
| APK permissions/ABIs | No Internet permission. Media3 adds ACCESS_NETWORK_STATE. APK includes arm64-v8a, armeabi-v7a, x86 and x86_64 |
| Source extraction smoke | One original neutral page passed direct PDF text extraction and OCR after correcting renderer/font configuration; exact numbers/units and all three lines retained |

JVM tests run outside Android. Archive tests use synthetic PCM parser fixtures,
which are never delivered as narration or installed in the app. FSRS reference
vectors validate the configured deterministic implementation, not medical
learning efficacy or long-term real-user outcomes.

The extraction smoke initially failed with a bundled Poppler/font setup that
rendered overlapping characters. Inspection identified the rendering fault;
system Poppler 24.02.0 with system fontconfig and a writable cache produced a
legible page, and Tesseract 5.3.4 then preserved the intended text. See the
[text-only extraction record](benchmarks/source-extraction-smoke-2026-10-30.json).
This is a clean nonmedical page, not validation of medical tables, handwriting,
complex layouts, source coverage or clinical correctness. Human extraction and
coverage review remain mandatory.

## Android build environment and commands

Complete OpenJDK 17.0.20+8, Gradle 8.9, Android SDK platform 35 and Build Tools
34.0.0 on Linux x86-64. Both `javac` and `jlink` are required. The original stripped
runtime lacked `jlink`; installing a complete JDK resolved that build failure.
A stalled Kotlin daemon was replaced by the documented in-process compiler and
one Gradle worker. The final full build succeeded with the committed settings.

```sh
./gradlew :lesson-model:test :app:assembleDebug :app:assembleDebugAndroidTest :app:lintDebug --no-daemon
python3 -m unittest discover -s tools/breeze -p 'test_*.py' -v
python3 -m unittest discover -s tools/production -p 'test_*.py' -v
apksigner verify --verbose --print-certs app/build/outputs/apk/debug/app-debug.apk
```

Kapt emits its Kotlin language-version compatibility warning and Room annotation
processor option warnings; they did not fail compilation. Native dependency
libraries were packaged unchanged when stripping was unavailable. No warning was
silenced to represent a false zero-warning build.

## Real CPU narration and package evidence

The historical short CPU probe, exact model/source/submodule versions and new
full-track measurements are in [BREEZE_CPU.md](BREEZE_CPU.md). Actual narration
uses the unchanged standard Q8_0 CPU binary. No model/quantization substitution,
GPU service or placeholder audio is used. The original smoke's upstream CPU
regression test passed at `c5eea4d`; that synthetic-tensor test is not speech
quality validation.

The separate Lantern Library package contains original nonmedical facts,
artwork, both real narration files and actual segment boundaries. Source and
listening review flags remain false. The package builder invokes the exact JVM
archive validator used by the Android importer. SHA-256 identities and measured
WAV duration are recorded with the delivery artifacts below.

## Emulator runtime checks

Runtime results are being recorded before this checkpoint is saved. The test
setup is Android 8.0 / API 26, Google APIs x86_64, emulator 37.2.13.0 build
16740729, software CPU emulation without KVM, SwiftShader, 800 × 1280 display,
1024 MiB guest RAM and 2 virtual cores. Host audio is disabled. Runtime playback
checks therefore exercise Media3 decoding/content-clock behavior, not subjective
listening or speaker/headphone output.

The instrumented suite requires the separately supplied real ZIP. It fails if
the fixture is absent; it does not skip or synthesize replacement audio. After
installing the app and test APK, a POSIX host can copy the fixture into the debug
app's private files and run the suite:

```sh
adb install -r app/build/outputs/apk/debug/app-debug.apk
adb install -r app/build/outputs/apk/androidTest/debug/app-debug-androidTest.apk
adb shell run-as com.sketcy.ctvs mkdir -p files/fixtures
adb shell 'run-as com.sketcy.ctvs sh -c "cat > files/fixtures/technical-demo.zip"' < /absolute/path/sketcy-lantern-library-v1.zip
adb shell am instrument -w -r com.sketcy.ctvs.test/androidx.test.runner.AndroidJUnitRunner
```

The four instrumented cases cover:

1. Library → overview → Symbol Explorer → review, answer concealment/reveal and
   persisted Easy rating.
2. Actual Media3 playback/content position, pause during buffering, seeking,
   shared-fact mode switching, speed and reduced-motion timeline behavior.
3. Activity recreation retaining the player and advancing position, background
   pause, persisted progress and reopening without overwriting resume with zero.
4. Actual ZIP import, unchanged/changed fact updates, wrong-answer Again, full
   backup/restore, settings journal completion, invalid import/restore safety,
   and rejection of stale player writes after restoring identical content.

ActivityScenario recreation is a lifecycle test. It must not be described as a
physical rotation, force-stop restart, hardware audio-focus test or physical
installation. Additional manual emulator observations are recorded separately.

## Build automation and repository checks

The GitHub Actions workflow pins checkout, setup-java and upload-artifact to
verified upstream commits. It builds with JDK 17/platform 35/build-tools 34.0.0,
runs the 38 JVM and 18 Python tests, builds both APKs, and runs lint. It uploads a
debug APK and reports. It does not download model weights or run instrumented
playback tests, because the actual generated ZIP is excluded from Git. Workflow
configuration is not, by itself, a successful GitHub Actions run.

The final save checks local Markdown links, JSON parsing, `git diff --check`,
tracked/candidate media/credential exclusions, and the committed tree/files
against GitHub. All generated media, model weights, SDKs, test PDFs and private
signing material stay outside the repository.

## Acceptance that remains open

- **No human listening or ASR review.** Container/signal/duration checks do not
  prove spoken completeness, pronunciation, clarity, clean joins, pacing,
  consistent voice or correct endings. The shared voice anchor is also unreviewed.
- **No physical Android device validation.** Speaker/Bluetooth/wired-headphone
  audio, interruptions/focus, physical rotation, accessibility/TalkBack and broad
  Android/OEM compatibility require the [device checklist](INSTALLATION.md).
- No medical source, verified medical fact inventory or medical pilot. The
  technical demo cannot establish preservation of every supplied medical fact.
- Captions use measured paragraph boundaries, not word-level forced alignment.
  A repeated fact maps to its first matching segment in the destination track.
- No isolated/repeated CPU performance benchmark, on-phone TTS measurement,
  sustained memory stress, abrupt power-loss test or large-library soak test.
- Release signing, Play Store publishing, Anki synchronization, cloud backup,
  accounts and background audio service are outside this personal-test release.

The app is an installable engineering checkpoint. Medical, listening and physical
acceptance remain explicit and must not be inferred from passing automated tests.
