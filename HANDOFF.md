# Worker handoff — two Studio-authored cardiac examples delivered

## Current checkpoint — 31 October 2026

The latest request, **two example lessons using the updated internal Studio**, is
complete as a demonstration delivery. Work alone, use English and keep Studio off
the student side. Stop here for the user's review; the other eight proposed
demonstrations have not been produced as finished lessons.

| Lesson | Explanation | Story | Independent objects | Facts |
| --- | ---: | ---: | ---: | ---: |
| CABG — The Bypass Mountain | 107.20 s | 106.80 s | 7 | 6 |
| Surgical aortic valve replacement — The Gatekeeper Courtyard | 111.84 s | 107.92 s | 6 | 6 |


Both schema-2 ZIPs contain actual pinned Breeze TTS 2 Q8_0 CPU narration, separate
backgrounds and transparent object PNGs, measured captions/camera cues, per-track
object motion, linked sources and review questions. Every track is 60–240 seconds
at normal speed. There is no placeholder audio, silence padding, time stretching,
GPU synthesis or alternate TTS. The same synthetic voice is used throughout.

The user authorized public medical sources for these testing examples. Both use
the explicit `EXTERNAL_REVIEW` policy and official NHS/NHLBI references. Each
selects six introductory facts; neither claims complete coverage of its source
articles. Source and listening approval flags remain false. `USER_SOURCE` still
requires learner-supplied material, named human source and listening approval.

### Delivered files

- `Sketcy-Preview-0.3.0.apk` — separate `com.sketcy.ctvs.preview` app, Android 8+.
- `01-CABG-Bypass-Mountain.zip` and `02-Aortic-Valve-Gatekeepers.zip` — import these
  separately through **Sketcy Preview → Library → Import**, without extracting.
- `Two-Cardiac-Lessons-Review-Guide.pdf` — four illustrated pages, twelve facts
  and six official source links.
- `Two-Lesson-Studio-Projects.zip` — two portable projects with embedded original
  image/audio assets, scripts, measured cues, source records and execution evidence.
- Two full scene PNG previews, `START-HERE.txt` and `SHA256SUMS.txt`.

These were supplied separately from Git. Recover the named delivered project
bundle to revise artwork; the repository deliberately contains no model weights,
generated images/audio, full source downloads, personal documents or credentials.
The authoring bundle is not an Android import ZIP. The previous 0.2 importer
cannot read schema 2. Sketcy Preview installs alongside it and has its own library.

### Implementation and evidence

Android/Studio implementation: `640920eab864e881a61a86b8535a877c695ec23e`.
Camera-preserving production bridge: `09a89805e53c8af1eb8d882da3e910764785c366`.
Read [verification](docs/VERIFICATION.md), [schema 2](docs/LESSON_PACKAGE_V2.md)
and the [measured delivery record](docs/evidence/two-cardiac-lessons-2026-10-31.json).
The final documentation checkpoint records those tested implementations.

Observed: 44 JVM tests, 47 Studio core/CLI tests, 15 Chromium tests, 12 Breeze
tooling tests and 11 production tests passed. Both real lesson ZIPs passed the
shared Kotlin archive validator. Debug, preview and instrumented-test APKs
compiled; lint has zero errors and 14 warnings. APK v2 signature, alignment,
package ID and minSdk were checked. The previous schema-1 Lantern Library ZIP
still validates. **Zero Android emulator/device tests ran in this increment**;
the environment has no `/dev/kvm`. Browser checks are not Android tests.

### Next step after the user's review

Record actual phone import/playback, seeking, speed, shared-fact narration
switching, captions/highlights, independent motion and Still scene. Review all
four tracks by listening, including medical pronunciation and transitions;
review medical scope and fact/source completeness. The independent automated
transcript comparison is evidence, not human approval. Keep review flags false
until the corresponding review is actually performed and attributed.

One possibly clipped story ending was regenerated with the same model/script
and voice using seed 43; both attempts are recorded. Check the `heart-lung`
pronunciation in the valve story support segment during listening review.

For revisions, open the delivered projects in Studio or use `studio/agent.mjs`.
If scripts or fact links change, regenerate affected narration through the same
pinned CPU path, measure actual frames, realign cues and export again. Do not
reuse mismatched audio or simply rescale draft cues. The bridge preserves camera
targets, easing, transition durations, PNG placement and independent pivots.
No permission is needed for already authorized routine fixes; do not expand
past these two examples without a new direction. A learner-source medical pilot
still needs the learner's own PDF/text.

## Previous Studio 0.1 checkpoint (historical)

## Latest user direction and saved work

30 October 2026 (UTC): build an Illustrator-like tool inside this repository, make the
plan first and start building without asking questions. The user explicitly
clarified: **the assistant uses this tool to build lessons; it must not appear
on the student side.** Work alone and use English. The implementation below
fulfills the first authoring milestone; it does not claim Adobe feature parity.

Read [STUDIO_PLAN.md](docs/STUDIO_PLAN.md), [studio/README.md](studio/README.md),
[studio/AGENTS.md](studio/AGENTS.md), [STUDIO_FORMAT.md](docs/STUDIO_FORMAT.md)
and [ART_DIRECTION.md](docs/ART_DIRECTION.md). `studio/agent.mjs` is the primary
agent interface. `studio/server.py` provides an optional loopback-only browser
workspace. No Android source, navigation, dependency or package contract changed.

Completed: editable vector and raster layers; grouping, transforms, pen/Bézier
editing and history; embedded-asset project Save/Open and local recovery;
source/fact links; distinct explanation/story cues; actual WAV-clock preview;
camera and object keyframes with reduced motion; SVG/PNG and transparent layer
exports; source-preserving production handoff; command-line authoring; pinned CI.
The original neutral Lantern Workshop demo is vector code and silent draft
timelines, distinct from the earlier narrated Lantern Library Android package.

Local verification: **45 core/CLI checks and 15 real Chromium checks passed**.
Layer export produced one background and seven actual transparent PNGs. Their
integer-coordinate recomposition differs from the original by at most 4/255 in
one channel; mean absolute channel difference was 0.000369/255. These are real
render/import/export checks, not Android device tests or narration acceptance.
See [VERIFICATION.md](docs/VERIFICATION.md) for exact environment and scope.

The implementation is saved at `92c331a4ae67eabca95295da3195c901d98b7327`.
The [hosted Studio run](https://github.com/blsmohamme972-lab/sketcy-CTVs/actions/runs/41144223907)
also passed all 45 core/CLI and 15 browser checks. All 37 saved file identities
were verified against GitHub. This handoff's follow-up edit records hosted
verification and does not modify the tested tool.

### Continue here

1. Import and preserve the existing measured Breeze generation ledger in Studio,
   including exact code/model/voice hashes. Imported WAV alone remains unverified.
2. Extend the Android format and renderer for independent object layers with
   deterministic seek, speed, mode switching and reduced motion. Current package
   v1 supports one PNG per part; do not claim Studio motion is already in Android.
3. Use the authoring commands and drawing rules to complete the first three
   cardiac layered demonstrations. Earlier flattened scenes/background drafts
   do not supply the missing transparent cutouts, narration or device checks.
4. Keep source preservation, listening and physical-device acceptance open until
   actually reviewed. Studio handoffs reset both review flags and are not ZIPs.

The user authorized public medical sources for the separate ten-lesson testing
demonstration. Preserve real source attribution and use `EXTERNAL_REVIEW` in
Studio for those drafts. The current v1 Android contract does not support that
content type. Do not bypass this by claiming the sources were supplied by the
learner or the content is nonmedical. The showcase PDF is an art reference only.

User-supplied screenshots show the Android Library and Review screens running
and a failed import message. They are launch/UI evidence, not a completed
installation, audio, lesson import, review or backup acceptance checklist.

## Previous Android 0.2.0 checkpoint (preserved)

The user directed “Do all work now” after the bounded Breeze CPU feasibility
checkpoint `c5eea4d16d8f6aced4c41c83add7f657a9e4dcf2`. The current checkpoint
implements the offline Android import, playback, exploration, review and backup
workflow, plus a source-preserving authoring toolkit. **Implementation is not
medical, listening or physical-device acceptance.** No medical source has been
supplied; do not invent a medical pilot or claim the product is fully accepted.

## Browser delivery follow-up

The user explicitly approved a public APK release after asking for a Chrome
download. [The Android preview release](https://github.com/blsmohamme972-lab/sketcy-CTVs/releases/tag/v0.2.0-android-preview) contains
`Sketcy-CTVS-0.2.0.apk` from the previously successful CI run of `b0f7cc6`.
No application code changed. The public download returned HTTP 200; its SHA-256,
ZIP integrity, signature, alignment and package identity were checked again.
The temporary publishing workflow was removed after delivery verification.
The routine Android build workflow retains its read-only repository permission.

The public APK has a different debug certificate from the earlier chat-delivered
APK. Preserve both artifact identities in [verification](docs/VERIFICATION.md#public-browser-download).
The reported package parsing error is not diagnosed or confirmed fixed; actual
phone installation and all earlier runtime/listening/medical acceptance remain
open. Do not infer a device pass from a valid public download.

## Start here

1. Read this file, [README.md](README.md), and [PLAN.md](PLAN.md).
2. Check GitHub `main` and the local working tree before editing. This checkpoint
   is the commit containing the version 0.2.0 handoff; use `git log -- HANDOFF.md`
   to obtain its exact SHA rather than relying on a transient workspace.
3. Read [verification](docs/VERIFICATION.md), [Breeze CPU evidence](docs/BREEZE_CPU.md),
   and [installation](docs/INSTALLATION.md) before repeating or extending checks.
4. Preserve [package v1](docs/LESSON_PACKAGE.md) and the
   [audio-position timing contract](docs/PLAYBACK_TIMING.md).

Repository: `blsmohamme972-lab/sketcy-CTVs`; branch: `main`.
Earlier checkpoints: foundation `6f74243`, timing core `d58a734`, short CPU probe
`c5eea4d`. Work alone and use English.

## Implemented

- Kotlin/Compose, Android 8+ (API 26), Media3, Room and DataStore. No account,
  server, analytics or Internet permission. The app starts with an empty library.
- Search, topic/bookmark filters, objectives, source quotations, per-track
  completion/resume, original illustration presentation and Symbol Explorer.
- Strict ZIP/JSON import with bounded extraction, duplicate/path/link/CRC/SHA
  checks, exact source quotes, fact coverage, PNG decoding and actual PCM duration
  validation. Every part requires distinct 60–240-second explanation/story files.
- Real local Media3 playback. `currentPosition` drives `PlaybackTimeline` for
  captions, highlights and camera movement. Seeking, speed, shared-fact mode
  switching, reduced motion, manual pan/zoom and landscape fullscreen are wired.
- Foreground playback lifecycle, audio focus and noisy-output handling. Rotation
  retains the player; backgrounding pauses. Position saves about once per second
  and on transport actions. There is no background playback service.
- Four review types, concealed answers, source evidence after reveal, incorrect
  objective answers forced to Again, and persistent per-fact FSRS v6/history.
  The deterministic port matches 24 pinned canonical reference steps, with 90%
  default retention and explicit learning/relearning behavior.
- Transactional lesson updates, stale-player protection, full backup/restore,
  recoverable settings writes and startup orphan cleanup. Unchanged facts retain
  scheduling; changed facts restart learning. Playback resume requires unchanged
  facts/audio and the current installation identity.
- Text/PDF/OCR extraction, explicit human source-review gates, pinned Breeze CPU
  generation, measured segment assembly and ZIP creation with the same JVM
  validator as Android. See [production instructions](tools/production/README.md).
- APK/test-APK builds and a pinned GitHub Actions build/test/lint workflow.
  Building an instrumented APK is separate from running its tests.

## Real narration and the technical demo

The separately delivered **Lantern Library** is original, nonmedical material
with original artwork and real Breeze CPU narration. Its source snippets are
explicitly not user-provided medical evidence. The package has three fact groups,
two separately generated tracks, measured paragraph boundaries, camera cues,
three hotspots and twelve review questions. No audio is embedded in the APK.

Measured complete tracks: Explanation **86.88 s**, Story **91.04 s**. All eight
CPU segment processes exited successfully. The final debug APK is 13,408,761
bytes after removing the unused extended icon collection; its fourteen extra
interface icons are small original vectors. Artifact hashes and the debug
certificate identity are in verification, and the APK/ZIP are supplied separately.

The exact code, model, cached synthetic voice, process resources, generated WAV
hashes and durations are recorded in [BREEZE_CPU.md](docs/BREEZE_CPU.md) and its
linked text-only benchmark reports. Use standard Q8_0 only: source
`2904b9ad126c07363e8a6c9afa08f73e3309075b`, model revision
`81b22bad9f05b99970e30c5ee5e4bbc52fedf2f8`, model SHA-256
`a02bcc4b69b0601032727f8040c4942149b1b73aa0f69022fe5aaa6a8f0ef879`.
Both GPU backends are disabled. Generation is an authoring-computer task; Android
does not run or download the model. Some measured generation overlapped builds
and a software emulator, so it is not an isolated performance benchmark.

**Human listening remains open.** No listening or ASR assessment was available in
this session. Nonzero PCM, headroom, hashes and correct duration do not prove
word completeness, pronunciation, clarity, voice consistency or clean joins.
The technical package retains false review flags. Captions cover complete
synthesized paragraphs; there is no word-level forced alignment. A shared cached
voice is recorded conditioning, not proof of perceptual consistency.

## Verification and remaining acceptance

The application code at `b0f7cc6f512b26d260a9a07cdd8e5668ac9ac92e` passed the
[fresh GitHub Actions run](https://github.com/blsmohamme972-lab/sketcy-CTVs/actions/runs/41126878920).
The final checkpoint adds verification documentation to that tested code.
Local results: 38 JVM tests, 18 Python tests, both APK builds and lint (0 errors,
14 advisory warnings). The signed APK and real demo ZIP were saved separately.

**Emulator app validation is blocked, not passed.** Android 8 booted under
software emulation without KVM, but even the final smaller APK installation
timed out after 600 seconds. Stock System UI showed an ANR before app launch.
Four instrumented tests compile, but zero executed. Import, playback, camera/UI,
rotation, offline restart, review and backup still need actual runtime checks.
Retry on an accelerated emulator or physical device using the real supplied ZIP.
The temporary emulator was stopped; do not silently carry a device-pass claim
into the next checkpoint.

Read [VERIFICATION.md](docs/VERIFICATION.md) for final, separately classified JVM,
Python, Android build/lint, emulator and artifact results. Do not reinterpret
emulator playback with muted host audio as a listening pass or physical-device
validation. Runtime tests require the actual generated ZIP supplied separately;
they deliberately fail when it is missing instead of using substitute audio.

The remaining acceptance work is:

1. Listen to every sentence in both real tracks against the scripts. Record
   omissions/substitutions, pronunciation, noise, joins, pacing, voice consistency
   and endings. Failed CPU inference or failed quality review pauses audio work;
   do not substitute another TTS model, quantization, GPU service or placeholder.
2. Install the delivered APK on a physical Android device and complete the
   [device checklist](docs/INSTALLATION.md), including audio focus, headphone
   disconnection, actual sound, accessibility and backup transfer.
3. Obtain the learner's first PDF/text. Inventory every fact and exact source
   location, review extraction/OCR and coverage, produce both scripts and original
   art, then generate and listen to both 1–4-minute tracks. A neutral technical
   demonstration cannot satisfy the medical pilot requirement.

Do not erase these gates to claim 100% completion. The software can be exercised
now; the missing medical input and human/device acceptance remain explicit.

## Reproduction and storage conventions

Use a complete JDK 17 with `javac` and `jlink`, Gradle 8.9, SDK platform 35 and
Build Tools 34.0.0. The configured one-worker/in-process compiler avoids excess
memory use while authoring. Build commands and test-fixture setup are in README
and verification. No local SDK paths belong in Git.

The authoring environment used GCC 13.3, CMake 3.31.6, Python 3.12.14, a Xeon
Platinum 8573C VM, an 8-CPU quota and an 8 GiB memory limit without swap. Keep
large CPU inference, Gradle and a software emulator from exhausting that limit.
Preserve proxy/TLS configuration when downloading; do not reuse credentials from
old logs or workspaces.

Keep model weights, generated media, lesson ZIPs, user PDFs/text and credentials
outside Git. Deliver APKs/lesson packages separately. Source-derived excerpts
belong in private lesson packages, not public code examples. This repository's
examples and test passages are original neutral material. Update README, this
handoff and verification whenever the saved checkpoint changes.
