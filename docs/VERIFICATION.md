# Verification — Android 0.3, measured Studio bridge and historical checks

## Android 0.3 / two-example engineering checks — 31 October 2026

| Check | Observed result |
| --- | --- |
| Kotlin JVM | 44 passed, zero failures; includes v1 origin gates, v2 source/layer validation, deterministic seeks, separate track keys and reduced motion |
| Studio core/CLI | 47 passed; stable IDs, explicit part identity, retained external URL and short camera transitions with longer captions |
| Chromium | 15 passed; real browser/renderer tests, separate from Android |
| CPU tooling / production | 12 and 11 passed respectively; production includes measured-boundary, fact-link, hash, pivot and placement checks |
| Android build | `assembleDebug`, `assembleDemoPreview`, `assembleDebugAndroidTest` passed |
| Android lint | Zero errors/fatals; 14 warnings, not a warning-free report |
| Preview APK | `com.sketcy.ctvs.preview`, 0.3.0-preview, minSdk 26, targetSdk 35, 12,703,450 bytes |
| APK integrity | APK Signature Scheme v2 verified; zip alignment checked; no device installation inferred |
| Emulator/device | Zero tests executed in this increment; `/dev/kvm` absent |

Local JDK: Eclipse Temurin 17.0.21+9, verified archive SHA-256
`8b9b611d917e3dfd8419d3566b5949226f69b052fed7e109c1368add1dfe8711`.
Gradle 8.9, Kotlin 2.0.21, SDK 35/build-tools 34.0.0; existing dependency pins
remain unchanged. SDK downloads used the session proxy and its CA trust.
Node 24.22.1, Python 3.12.14, Playwright 1.56.1/Chromium 1194.
The restricted subprocess wrapper again suppressed captured CLI output; the
same suite passed with subprocess permission. No failing assertion was removed.

Preview APK SHA-256:
`9f3c05bd29c401b7d4fd71c920c4feaae02d84aa6fa42a9ab0e3d7b4868abaa2`.
Debug signing certificate SHA-256:
`d5b5719cde48c7a7344b3567c3abe73d0eddf9e792f6867d0f84094e51d23927`.
This is a review build with a separate app identity, not a production release key.

### Completed two-lesson delivery

| Lesson | Explanation | Story | Independent objects | Facts |
| --- | ---: | ---: | ---: | ---: |
| CABG — The Bypass Mountain | 107.20 s | 106.80 s | 7 | 6 |
| Surgical aortic valve replacement — The Gatekeeper Courtyard | 111.84 s | 107.92 s | 6 | 6 |


Both actual ZIPs passed the shared JVM archive parser, including bounded ZIP
structure/CRC, source quotes and coverage IDs, PNG metadata/hashes, layer
placement, exact media duration and all referenced assets. The old schema-1
Lantern Library ZIP also passed with explanation 86,880 ms and story 91,040 ms.
These are real-file parser checks, not Android import/playback tests.

The four-page PDF was rendered and all pages visually inspected. All twelve
symbol cards and six clickable official source URLs were checked for layout and
text extraction. Both scene compositions and representative moving/still frames
were inspected. All thirteen placed objects have real transparent and visible
pixels. Reduced-motion frames match their respective base compositions.
Separate alpha rasterization is not byte-identical to flattened composition;
the measured per-pixel differences are recorded in the JSON evidence.

### Actual Breeze CPU measurements

Source commit `2904b9ad126c07363e8a6c9afa08f73e3309075b`; ggml
`36da57138425487184aa1da2eee2cde155909c6f`; shine
`ab5e3526b64af1a2eaa43aa6f441a7312e013519`. Model repository revision
`81b22bad9f05b99970e30c5ee5e4bbc52fedf2f8`; standard
`breeze-tts-2-q8_0.gguf`, 3,568,844,480 bytes, SHA-256
`a02bcc4b69b0601032727f8040c4942149b1b73aa0f69022fe5aaa6a8f0ef879`.
All pins were verified against `tools/breeze/versions.json`. A clean CMake 3.31.6
Release CPU build with GCC 13.3 disabled CUDA, Vulkan, server/shared and MP3
output and passed upstream `depth-replay-cpu`. The preceding neutral smoke
generated 11.76 seconds.

Hardware reported AMD EPYC 9V74, nine affinity CPUs and an eight-CPU cgroup quota,
with an 8 GiB memory limit and no swap. The initial 24 synthesis processes used
`--cpu --seed 42 --cfg-scale 1 --split-chars 0 --max-new 750 --timings` and the
same encoded synthetic voice. One targeted retry of `valve-story-5` used seed 43
with the same model, script, voice and other settings after recognition flagged
a possibly clipped final phrase. Both attempts and the selection evidence are
retained in the authoring records; the lesson uses the complete replacement.
The version file's default split limit is 600; the executed per-segment commands
explicitly used zero. The anchor came from
the earlier synthetic Breeze Lantern Library narration, not a real-person clone.

| Track | Audio seconds | CPU generation wall seconds | Peak process RSS (GiB) | Automated word edits / words |
| --- | ---: | ---: | ---: | ---: |
| cabg/explanation | 107.20 | 758.02 | 4.235 | 1 / 223 |
| cabg/story | 106.80 | 750.95 | 4.230 | 1 / 224 |
| valve/explanation | 111.84 | 785.43 | 4.232 | 2 / 232 |
| valve/story | 107.92 | 769.60 | 4.226 | 2 / 233 |


Selected segment-process wall time: **3064.00 seconds
(51.07 minutes)** for
**433.76 seconds** of finished narration. Maximum process
RSS: **4.235 GiB**.
The rejected first attempt added **129.84 seconds**;
all synthesis attempts together took
**53.23 minutes**.
Voice encoding was separate: **6.81 seconds**,
**3.929 GiB** peak RSS.
Authoring, builds and brief recognition checks overlapped generation, so these
are observed production times, not an isolated hardware benchmark.

Tracks concatenate only original mono 24 kHz, signed 16-bit PCM segment frames.
No silence was added; no resampling, speed alteration, alternate model, GPU
service or placeholder audio was used. Every track measures 60–240 seconds from
its actual frame count. Peak/RMS levels, full-scale sample fractions, file hashes,
CPU user/system seconds and run identities are in
[`two-cardiac-lessons-2026-10-31.json`](evidence/two-cardiac-lessons-2026-10-31.json).

### Audio-quality findings and limits

An independent local CPU/int8 recognition pass used faster-whisper 1.2.1,
CTranslate2 4.8.4 and pinned `Systran/faster-whisper-base.en` revision
`3d3d5dee26484f91867d81cb899cfcf72b96be6c`. It generated no narration. Recognition
used no script prompt, no previous-text conditioning, beam size 5 and no VAD.
Analysis decoded temporary 16 kHz float PCM in memory; delivered WAV bytes were
unchanged. Across all 24 segments, normalized comparison found
**6 word edits in 912 reference words**.
The private authoring bundle retains both expected and recognized text, allowing
individual differences to be reviewed. Recognition is fallible: this does not
prove pronunciation, prosody, voice consistency or medical accuracy.

Observed recognition differences include route/root, spill/spell, tradeoff
tokenization, and one rendering of **heart-lung** as **heart long** in the valve
story's support segment. That medical term specifically needs listening review;
the comparison cannot distinguish a recognition mistake from a pronunciation
issue. No claim of perfect speech or a subjective audio-quality pass is made.

No human listening or clinical/source-completeness acceptance occurred here.
Both packages keep `audioReviewed: false` and `sourceCoverageReviewed: false`
and a visible `EXTERNAL_REVIEW` label. The official sources supplied six selected
introductory facts per lesson; neither source article coverage nor the other
eight proposed demonstrations is represented as complete.

### Saved implementations and hosted checks

Implementation commit `640920eab864e881a61a86b8535a877c695ec23e` passed both
[Android](https://github.com/blsmohamme972-lab/sketcy-CTVs/actions/runs/41169388182)
and [Studio](https://github.com/blsmohamme972-lab/sketcy-CTVs/actions/runs/41169388179)
GitHub workflows. Camera preservation was added at
`09a89805e53c8af1eb8d882da3e910764785c366`; its production suite passed locally
and the separate [hosted Android/tooling workflow](https://github.com/blsmohamme972-lab/sketcy-CTVs/actions/runs/41169862501)
also passed, including builds, JVM/Python tests, lint and artifact upload.
The complete Git trees and changed file blob identities were fetched and matched
against the staged local files before marking each save complete.

### Delivered artifact identities

| File | Bytes | SHA-256 |
| --- | ---: | --- |
| `Sketcy-Preview-0.3.0.apk` | 12,703,450 | `9f3c05bd29c401b7d4fd71c920c4feaae02d84aa6fa42a9ab0e3d7b4868abaa2` |
| `01-CABG-Bypass-Mountain.zip` | 16,450,127 | `17f3ed9d45e8eeb89e8c08d31b04b8020f61933f4a81b4349bc8dc6b2cee30c6` |
| `02-Aortic-Valve-Gatekeepers.zip` | 16,498,406 | `bdf41d7b4de3e83a8753d5ea8ec142d62cba504dfe2abacf1448af33b19bac9d` |
| `Two-Cardiac-Lessons-Review-Guide.pdf` | 9,613,492 | `2ea35e59137404d828b07bcca827739266b84038ab9312bb164b61098b31a63d` |
| `CABG-Bypass-Mountain.png` | 3,583,149 | `46016ac5c18839e9e5154a0d690042afb1424cca6d4f640fd246c91df51920f4` |
| `Aortic-Valve-Gatekeepers.png` | 3,633,618 | `3852f59fa1ef0ebd3d0d96b25faa0e1da8818529aee678c5684f7e0391f6a6a3` |
| `START-HERE.txt` | 2,270 | `bcaab0b2e06bb323792ec42385d662a4c08b414bd38d55e5ac24e5c03bde66b8` |
| `Two-Lesson-Studio-Projects.zip` | 53,034,795 | `86e3104984ca26bd6fb35917c39298ddc4d5b08fb58d163029d80a487c7f3cf0` |


The APK was built from the tested Android implementation at `640920e`; the later
camera correction changes only the authoring bridge and its test/documentation.
The delivered files are stored outside Git. `SHA256SUMS.txt` accompanies them.
`Two-Lesson-Studio-Projects.zip` is an editable authoring archive, not a student
lesson ZIP. No model weights, full downloaded articles, source PDF or credentials
are included. File-format integrity does not establish successful phone import.

## Studio 0.1 internal authoring — 30 October 2026 (UTC)

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

### Hosted Studio verification and saved files

The [Studio GitHub Actions run](https://github.com/blsmohamme972-lab/sketcy-CTVs/actions/runs/41144223907)
**passed** for implementation commit
`92c331a4ae67eabca95295da3195c901d98b7327`. Its downloaded job log confirms all
45 core/CLI tests and 15 browser tests passed with zero failures. Formatting,
Python compilation, browser installation and verification-artifact upload also
passed on the hosted runner. The runner emitted an action-runtime deprecation
advisory for the pinned v4 actions; execution was successful under its automatic
Node 24 action-runtime migration. This is separate from the Node 22 test runtime.

The existing [Android workflow](https://github.com/blsmohamme972-lab/sketcy-CTVs/actions/runs/41144224215)
also started automatically for this commit. At the 23:27 UTC status check, its
Python tooling steps had passed and the JVM/build/lint step was still running.
That check is not recorded as a new Android pass here. No Android source changed;
this Studio milestone's confirmed hosted results are the 60 authoring checks
above. Historical Android results and open physical-device gates remain below.

All 37 changed files were fetched from GitHub and their Git blob identities
compared with the exact staged files. The complete saved tree matched
`31037edebfc9b3a0d8dd9d8b00d2e8bf0c1599b4`, and the local checkout was clean.
The following documentation-only checkpoint records these results; it does not
change the tested Studio implementation. Its commit uses `[skip ci]` because
only verification documentation changed; the implementation run remains linked
above and the existing Android run is left undisturbed.

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
