# Source-to-lesson production

This toolkit runs on the authoring computer. The Android app imports finished
ZIPs and does not run TTS or an LLM. It has no Internet permission. Keep user
sources, extracted passages, weights, saved voices and generated media outside
this repository.

## Internal visual authoring

Use [Sketcy Studio](../../studio/README.md) and its
[agent instructions](../../studio/AGENTS.md) to create one complete image per
lesson, connect source facts, and preview both narration modes. Generate the
background and all characters and props together in one image-generation call,
then import the result:

```sh
node studio/agent.mjs new --image /private/lesson.png --title "Lesson" --id lesson-01 --out /private/lesson.sketcy-studio.json
```

The image's original dimensions must be 64–4096 pixels per axis. Studio embeds
it as one locked full-canvas image, preserving transparency. It imports the
completed picture; image generation runs separately through the authorized
image tool. This tool is for the assistant; it is not in the student app.
Set the actual content policy and add exact source/fact references with patches.
Unpainted, visible rectangle nodes with `fill: "none"`, `stroke: "none"` and
`factIds` supply symbol hotspots without splitting the picture.
`node studio/agent.mjs handoff --project … --out-dir …` writes a real scene PNG,
`authoring.json` in this toolkit's input shape, a `narration-plan.json`, and
explicit draft timing. Continue through the real generation/review/package
steps below; a Studio handoff is not an importable ZIP.

The handoff's review flags start false. Its cue times do not override measured
Breeze segment boundaries. Use [`studio_package.py`](studio_package.py) for the
measured handoff. By default it packages one scene as one lesson with only the
complete `images/scene.png`, retaining camera cues, captions, hotspots and both
narration modes. No background/cutout generation or layer export is required.
It compares scripts, fact links, durations and cue boundaries with the generation
ledger, then invokes the existing packager and JVM validator. Optional
`--layers` adds independent objects under [schema 2](../../docs/LESSON_PACKAGE_V2.md)
and verifies their pixel identities, placement and pivots.
The explicit `EXTERNAL_REVIEW` category permits visibly labeled public-source
test demonstrations with human review pending. It requires real external URLs;
it never makes external sources user-provided. `USER_SOURCE` approval gates
remain unchanged. Schema-2 ZIPs require Android 0.3, including Sketcy Preview.

## 1. Extract only material supplied by the learner

Python 3.12, Poppler (`pdfinfo`, `pdftotext`, `pdftoppm`) and optional Tesseract
with English language data are used. UTF-8 `.txt` and `.md` need only Python.

```sh
python3 tools/production/extract_source.py /private/source.pdf \
  --source-id source-01 --title 'Learner supplied source' \
  --user-provided --output /private/authoring/source.json
```

For scanned pages, add `--ocr`. The OCR path renders at most 2400 pixels per page,
runs Tesseract, and records words with confidence below 85 for review. Neither
that threshold nor successful extraction establishes correctness. Compare every
page with the original, including table headers, units, conditions, exceptions,
figure labels and reading order. Split sources larger than 100 MiB or 500 pages.
Empty pages are flagged; they are never silently counted as covered.

Before OCR, render a page with the same Poppler installation and inspect its glyphs.
A font-substitution problem can create plausible but incorrect OCR. In the managed
Linux validation environment, system Poppler 24.02.0 with
`FONTCONFIG_FILE=/etc/fonts/fonts.conf` and a writable `XDG_CACHE_HOME` rendered
correctly; the initial renderer/font configuration produced overlapping letters.
Do not accept a successful OCR process as source fidelity.

The result has a source checksum, exact page/passage excerpts, an empty `facts`
list and `needsHumanReview: true`. It is an inventory starting point, not a
finished lesson. Transcribe uncertain material manually and record the checked
reading. Ask the learner about contradictory or unclear passages; do not resolve
them with external medical content.

## 2. Build and review the complete fact inventory

Create one stable ID for each assessable fact. Preserve every source detail,
number, unit, condition, exception and relationship. Each fact needs `text` and
one or more `{sourceId, locator, quote}` references. Every quote must be an exact
substring of the cited excerpt. Keep an inventory-to-source coverage checklist;
mechanical ID coverage cannot prove that no source fact was omitted.

Use one scene and one part for each lesson package. Write two distinct English
scripts: an explanation of the supplied material and a mnemonic story. Story actions may be
invented; medical claims must still map to the source inventory. Use original
illustrations and consistent symbols. Include all symbols in the lesson's
single generated picture. Inspect the artwork, including counts,
colors, labels and symbol placement, before defining normalized hotspots.

The original technical demo is a complete **nonmedical** authoring example:

```sh
python3 tools/production/demo_authoring.py --image /private/library-scene.png \
  --output /private/authoring/demo.json
```

Its `lesson` object has `sources`, `facts`, `parts`, `symbols`, `questions` and
`quality`. `imageFiles` maps package paths to local original PNG files. Part
objects initially omit audio tracks; the packager supplies measured tracks.
See [the v1 package contract](../../docs/LESSON_PACKAGE.md) for all fields.
Do not copy the demo's `TECHNICAL_DEMO` label onto medical teaching.

## 3. Generate real Breeze CPU narration

First follow [the pinned Breeze setup](../breeze/README.md), including standard
Q8_0 checksum verification and the short CPU probe. A failed CPU generation or
failed listening review pauses the audio milestone. Do not substitute another
model, GPU service, quantization or placeholder audio.

After reviewing the initial synthetic sample, encode it once as a voice and
reuse that exact cached voice for every segment. No real person's voice is needed.
A shared cache establishes a common conditioning input; human listening is still
needed to assess voice consistency, pronunciation, completeness, pacing and joins.
The current technical demo remains explicitly unreviewed by a human listener.

A narration plan follows `demo-plan.json`: `lessonId`, `contentType`, and parts
with `id` and separate `tracks.explanation` / `tracks.story` arrays. Every segment
has a unique ID, the full intended text, fact IDs and symbol IDs. Keep segments
short enough to avoid the 750-frame cap. The runner rejects a cap-sized result;
revise the source-backed script and regenerate in a new directory rather than
padding or inventing speech.

```sh
python3 tools/production/narrate.py \
  --plan /private/authoring/plan.json \
  --breeze-dir /private/Breeze-TTS-2.cpp \
  --model /private/models/breeze-tts-2-q8_0.gguf \
  --anchor-wav /private/reviewed-synthetic-anchor.wav \
  --anchor-text /private/anchor-transcript.txt \
  --output /private/generation
```

`generation.json` records the pinned code/model inputs, environment, binary and
voice hashes, exact commands, per-process time/resource measurements, output
hashes and measured PCM frame counts. Unchanged successful segments can resume;
changed inputs/voice, failed prior runs or unrecorded output require inspection.
The runner uses the CPU CLI with `--split-chars 0` for exact per-segment boundaries.
It concatenates the generated PCM directly: no silent duration padding, invented
word timestamps, synthetic substitute narration, resampling or speed stretching.
Both assembled tracks must measure 60–240 seconds at normal speed.

## 4. Align, review and package

Listen against every intended sentence. Record errors and redo failed segments
with Breeze CPU. Check endings and joins, factual completeness, pronunciation,
consistent voice and acceptable pacing. `USER_SOURCE` lessons require both
`quality.audioReviewed` and `quality.sourceCoverageReviewed`, a named reviewer,
and useful review notes. These are recorded attestations, not an automatic
medical correctness guarantee. Do not set them without doing the reviews.

```sh
python3 tools/production/package_lesson.py \
  --authoring /private/authoring/lesson.json \
  --generation /private/generation \
  --output /private/deliverables/lesson-v1.zip
```

For a measured Studio project, attach the actual WAVs, patch cue boundaries to
their measured segment times, and export the handoff. Use the single-image
bridge instead of the general authoring JSON command above:

```sh
node studio/agent.mjs handoff --project /private/measured.sketcy-studio.json --part-id part-01 --out-dir /private/production
python3 tools/production/studio_package.py --handoff /private/production --generation /private/generation --output /private/lesson.zip
```

`--part-id` must match the narration plan. The bridge retains exact camera
targets and rejects guessed or rescaled cue boundaries. If independently moving
objects are needed, export their layers and add `--layers /private/layers`.
The complete-image path retains schema 2 for `EXTERNAL_REVIEW`; it does not
promote source or listening approval flags.

The packager verifies unchanged measured audio and the pinned generation ledger,
creates whole-segment captions and camera cues at actual segment boundaries,
writes media checksums, and runs the **same Kotlin archive validator used by the
Android app** before publishing the ZIP. The JVM step needs JDK 17 and the Gradle
wrapper; initial dependency resolution needs network access. Captions are
paragraph/segment aligned, not forced-aligned at individual words. A future
word-aligner must use actual narration and retain fact IDs.

The Android importer also decodes every PNG. JVM validation checks its signature,
IHDR checksum and dimensions but does not perform an Android bitmap decode.
Test the final ZIP on the Android player before approving it for learning.

```sh
SKETCY_PACKAGE_PATH=/private/deliverables/lesson-v1.zip \
  ./gradlew :lesson-model:run --no-daemon
python3 -m unittest discover -s tools/production -p 'test_*.py' -v
```

## What is not automatic

This toolkit does not infer a complete medical fact inventory, certify OCR,
resolve contradictory sources, generate artwork without inspection, assess
subjective audio quality or approve medical lessons. No user medical source has
been supplied at this checkpoint. The supplied library tour tests the engineering
path only. Keep its review flags false until a real listening/content review has
been recorded; never relabel it as the medical pilot.
