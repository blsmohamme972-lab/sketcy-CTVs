# Worker handoff — version 0.2.0 engineering checkpoint

The user directed “Do all work now” after the bounded Breeze CPU feasibility
checkpoint `c5eea4d16d8f6aced4c41c83add7f657a9e4dcf2`. The current checkpoint
implements the offline Android import, playback, exploration, review and backup
workflow, plus a source-preserving authoring toolkit. **Implementation is not
medical, listening or physical-device acceptance.** No medical source has been
supplied; do not invent a medical pilot or claim the product is fully accepted.

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
