# Verification — Studio 0.1 and Android 0.2.0

## Studio 0.1 internal authoring — 31 October 2026

This work adds the assistant's authoring tool only. No Android source or
dependency changed. The student app does not expose the editor. Tests use an
original nonmedical vector scene, local synthetic parser/media fixtures and
temporary files outside Git. No new Breeze narration, medical lesson package,
model download or human listening pass was produced in this milestone.

| Check | Observed result and scope |
| --- | --- |
| JavaScript core and agent CLI | **45 passed**: 25 model/geometry/source/history tests, 13 timing/WAV tests and 7 CLI process tests |
| Real Chromium browser suite | **15 passed**: 12 UI/media/persistence/server tests and 3 agent rendering/export/handoff tests |
| Layer export/recomposition | Original 1600 × 900 scene exported as one background and seven transparent object PNGs; all objects contain both zero-alpha and painted pixels; dimensions, placement and hashes match the manifest |
| Recomposition error | Maximum absolute 8-bit channel difference **4**; mean **0.0003690972**, consistent with separate raster alpha rounding; no missing or displaced scene objects |
| Deterministic frame rendering | Two independent story renders at 45,000 ms have identical SHA-256; the reduced-motion frame matches the base scene and differs from the moving frame |
| Production handoff | Actual PNG decoded; separate narration plans, exact source quotes and false review flags preserved; no ZIP or generated audio fabricated |
| Browser JavaScript errors | No uncaught page errors observed in the exercised UI workflows |
| Formatting and Python server | Pinned Prettier check and Python server compilation passed |
| Android validation in this milestone | No new emulator/device test; prior Android evidence remains in its separately dated section below |

Environment: Linux x86-64, Node **24.22.1**, Python **3.12.14**, Playwright
**1.56.1**, Chromium Headless Shell **141.0.7390.37** (build 1194), Prettier
**3.6.2**. Dependencies and integrity hashes are pinned in
`studio/package-lock.json`. The routine CI workflow uses Node 22 on Ubuntu 24.04
and the same pinned Playwright browser. The editor itself has no npm runtime
dependencies or external CDN assets.

The initially attempted Playwright 1.62.1 browser download returned a CDN error
page instead of a ZIP. The official 1.56.1 installer succeeded through its
automatic Microsoft mirror fallback. That exact working version is pinned;
there is no claim that it is the newest browser release. The sandbox also blocked
captured CLI subprocess output until the test command ran with subprocess
permission. All final test cases ran; none were skipped or converted to passes.

```sh
cd studio
npm ci --ignore-scripts
npx playwright install chromium --only-shell
npm run check
npm run format:check
npm run test:browser
python3 -m py_compile server.py
```

The local browser cache was selected with
`PLAYWRIGHT_BROWSERS_PATH=/tmp/sketcy-studio-browsers`. It is not committed.
The browser tests exercised pointer gestures, Bézier editing, lock/group
behavior, alpha-preserving import/export, save/reopen, IndexedDB recovery,
malformed-project rejection, exact-quote validation, shared-fact switching,
reduced motion, real media-clock seeking and source-preserving CLI handoff.
Test-generated PCM is a disposable clock/parser fixture, not narration supplied
to the user. No subjective audio-quality claim follows from that fixture.

Visual inspection identified an overly cropped camera focus; a shared viewport
fit now includes tall/wide target regions without aspect-ratio cropping, with a
regression check at artboard edges. The scene and editor screenshot were
visually inspected in addition to the
automated pixel checks. Browser evidence and recomposition metrics are emitted
under ignored `studio/test-results/` and retained as CI artifacts, not committed
media. The workflow definition is `.github/workflows/studio.yml`; a committed
workflow alone is not evidence that a hosted run passed.

Not established here: Safari/Firefox/mobile editing, assistive-technology
acceptance, arbitrary large-document performance, Adobe file compatibility,
medical/source completeness, narration pronunciation/listening, or Android
layer playback. System-font rasterization can differ across operating systems.
Independent object animation is a Studio preview/export capability; Android
package v1 still plays one flattened PNG per part. Cardiac cutouts, narration
and lesson review remain separate outstanding deliverables.

User screenshots later showed the Android Library/Review UI and an import error.
That is user-reported launch/UI evidence; it does not replace the device checklist
or make the historical zero-executed instrumented tests a pass.

## Historical Android 0.2.0 verification

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
| Instrumented test APK | `assembleDebugAndroidTest` passed; four cases compiled, **zero executed** |
| Emulator runtime validation | **Blocked**: API 26 booted, but final APK installation timed out after 600 seconds; no app runtime pass |
| Android lint | **0 errors, 14 warnings**: 13 newer-dependency advisories and KaptUsageInsteadOfKsp |
| APK signature | `apksigner verify` passed, v2 signature, local Android Debug certificate; not owner-controlled release signing |
| APK permissions/ABIs | No Internet permission. Media3 adds ACCESS_NETWORK_STATE. APK includes arm64-v8a, armeabi-v7a, x86 and x86_64 |
| Fresh GitHub Actions run | **Passed** for code commit `b0f7cc6f512b26d260a9a07cdd8e5668ac9ac92e`: JVM/Python tests, both APK builds, lint and artifact upload |
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

**Blocked at app installation. Zero instrumented tests executed.** The final
smaller APK did not finish installation within the 600-second timeout on this
software-only emulator. Android's stock System UI also displayed an ANR during
setup before Sketcy was installed. This does not identify an app crash or prove
that installation fails on physical Android devices. The measured setup and
terminal failure are in [the emulator record](benchmarks/android-api26-2026-10-30.json).
No app screenshots or manual app interaction are claimed. The emulator was stopped.

The attempted setup was Android 8.0 / API 26, Google APIs x86_64 revision 16,
emulator 37.2.13.0 build
16740729, software CPU emulation without KVM, SwiftShader, 480 × 800 display at 160 dpi,
1536 MiB guest RAM and 2 virtual cores. The installation compiler filter is `verify` (DEX verification with runtime JIT),
and test animation scales are zero. Host audio is disabled. A successful runtime
playback test in this setup would exercise Media3 decoding/content-clock behavior;
it would not establish subjective listening or speaker/headphone output quality.

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

The four compiled, **not executed** instrumented cases are intended to cover:

1. Library → overview → Symbol Explorer → review, answer concealment/reveal and
   persisted Easy rating.
2. Actual Media3 playback/content position, pause during buffering, seeking,
   shared-fact mode switching, speed and reduced-motion timeline behavior.
3. Activity recreation retaining the player and advancing position, background
   pause, persisted progress and reopening without overwriting resume with zero.
4. Actual ZIP import, unchanged/changed fact updates, wrong-answer Again, full
   backup/restore, settings journal completion, invalid import/restore safety,
   and rejection of stale player writes after restoring identical content.

The suite uses ActivityScenario recreation as a lifecycle test, which is
separate from physical rotation, force-stop restart, hardware audio-focus tests
and physical installation. None of these app runtime checks completed here.
Retry the supplied suite on a hardware-accelerated emulator or physical device;
do not substitute parser fixtures for the real narration ZIP.

## Build automation and repository checks

The GitHub Actions workflow pins checkout, setup-java and upload-artifact to
verified upstream commits. It builds with JDK 17/platform 35/build-tools 34.0.0,
runs the 38 JVM and 18 Python tests, builds both APKs, and runs lint. The command-line
tools 13.0 ZIP is downloaded explicitly and checked against SHA-256
`9673a4b9bdfc49a26022b047af0b8a91da74ed951ffd7dbe04181bce36980e6d`;
SDK paths are exported for Gradle. It uploads a
debug APK and reports. It does not download model weights or run instrumented
playback tests, because the actual generated ZIP is excluded from Git. Workflow
configuration is not, by itself, a successful GitHub Actions run.

The actual [successful run](https://github.com/blsmohamme972-lab/sketcy-CTVs/actions/runs/41126878920)
used Temurin 17.0.21+9 and completed the Gradle build in 5 minutes 10 seconds.
The exact source revision, completed job steps and log evidence are preserved in
[the CI record](benchmarks/github-actions-2026-10-30.json). The first workflow
attempt failed before tests because `sdkmanager` was missing from PATH; the
explicit, checksum-verified tool installation corrected that failure. A later
documentation-only checkpoint does not change the tested application code.

Final preflight checks local Markdown links, JSON parsing, `git diff --check`,
tracked/candidate media/credential exclusions, and the committed tree/files
against GitHub. All generated media, model weights, SDKs, test PDFs and private
signing material stay outside the repository.

## Installation-size correction

The first software-emulator installation spent minutes verifying unused classes
from Material Icons Extended, while Android itself displayed a System UI ANR.
The app now uses Material Icons Core plus fourteen small original vectors.
Uncompressed DEX payload decreased from 64,440,464 to 32,631,196 bytes. Recreating
the APK removed stale incremental ZIP space, reducing its download from
20,736,781 to 13,408,761 bytes (35.3%). Both APKs and lint
passed again. This does not imply a physical-device performance measurement.

## Delivered artifact identities

The earlier chat-delivered APK is debug-signed with certificate SHA-256
`d63055ff24dc6d93a9e91f82aca5c6eb26eb380dc0148a0bbf520768ffea0c17`.
A CI-generated debug certificate can differ; export a backup before replacing a
build with a different signing identity. Do not confuse a source revision with
bit-identical APKs signed by separate debug keys.

| Artifact | Bytes | SHA-256 |
| --- | ---: | --- |
| `sketcy-ctvs-0.2.0-debug.apk` | 13,408,761 | `c57894654d2cf18d38bd9ca235ef2f180051eec0284291c622e77ccb616db3f2` |
| `Sketcy-CTVS-0.2.0.apk` (public CI build) | 13,408,761 | `724ac6d6ed096603e8c3592caa0977f54e13b850a2fabd3861544ae2887730f3` |
| `sketcy-lantern-library-v1.zip` | 9,805,575 | `c8542beb693393cc280edafa83395d1288bcefa64f6a16e87357c490c77da224` |

The ZIP passed the JVM importer before publication. Its manifest declares
`TECHNICAL_DEMO`, three fact groups, twelve questions, actual explanation
86,880 ms and story 91,040 ms, one original PNG and two distinct WAV files.
`sourceCoverageReviewed` and `audioReviewed` remain false. The source is marked
`userProvided: false`. No media is embedded in the source repository or APK.

## Public browser download

The user explicitly approved publishing the debug APK in GitHub Releases.
[Preview release `v0.2.0-android-preview`](https://github.com/blsmohamme972-lab/sketcy-CTVs/releases/tag/v0.2.0-android-preview) points to application
commit `b0f7cc6f512b26d260a9a07cdd8e5668ac9ac92e`. It promotes the exact APK from
successful CI run `41126878920`, artifact `13011995495`; no rebuild or app source
change was needed. Publication run
[41130383669](https://github.com/blsmohamme972-lab/sketcy-CTVs/actions/runs/41130383669)
completed successfully. The temporary publishing workflow was removed afterward.
The normal build workflow remains read-only.

The [direct APK link](https://github.com/blsmohamme972-lab/sketcy-CTVs/releases/download/v0.2.0-android-preview/Sketcy-CTVS-0.2.0.apk) was fetched again without supplying an
account token. It returned HTTP 200, MIME type
`application/vnd.android.package-archive`, and an attachment filename of
`Sketcy-CTVS-0.2.0.apk`. All 13,408,761 bytes matched the published SHA-256.
ZIP CRC, `apksigner verify`, `zipalign` and Android package identity passed on
those downloaded bytes. The separate checksum and release-evidence downloads
also returned HTTP 200 and matched their recorded content hashes. Exact evidence
is in [the browser download record](benchmarks/android-browser-download-2026-10-31.json).

Public CI debug certificate SHA-256:
`041319bd276ab261871cfb619a486714d3335be7a5819c08583b3d4170236218`.
This differs from the earlier chat APK's certificate despite identical app
version and size. Back up an already installed app before switching signing
identities. These checks do not reproduce or diagnose the reported package
parsing error and do not establish a successful device installation. No emulator,
physical-device or listening acceptance was added by this delivery follow-up.

## Acceptance that remains open

- **No human listening or ASR review.** Container/signal/duration checks do not
  prove spoken completeness, pronunciation, clarity, clean joins, pacing,
  consistent voice or correct endings. The shared voice anchor is also unreviewed.
- **No completed emulator app validation.** The final installation attempt timed
  out, so import, Media3 playback, synchronization, lifecycle, review and backup
  behavior remain runtime-unverified despite compilation and pure-model tests.
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
