> This document defines the preserved schema-1 baseline. See [schema 2](LESSON_PACKAGE_V2.md) for independent layers and explicit external review demonstrations. Android 0.3 reads both versions.

# Lesson ZIP contract — version 1

The executable specification is
[`LessonPackage.kt`](../lesson-model/src/main/kotlin/com/sketcy/ctvs/lesson/LessonPackage.kt)
plus [`PackageArchive.kt`](../lesson-model/src/main/kotlin/com/sketcy/ctvs/lesson/PackageArchive.kt).
This version replaces the earlier design-only draft. Packages contain data,
original PNG illustrations and real Breeze CPU WAVs; they contain no executable
code, user progress or review history.

## Layout and identity

```text
manifest.json
images/scene.png
audio/part-01-explanation.wav
audio/part-01-story.wav
```

`manifest.json` is strict UTF-8 JSON. Duplicate keys, unknown fields, unsupported
schema versions, malformed values and excessive JSON nesting are rejected.
All stable IDs use `[A-Za-z0-9][A-Za-z0-9_-]{0,79}`. Asset names are simple relative
ASCII paths beneath `images/` or `audio/`; no absolute paths, backslashes,
traversal, hidden path segments, links or case collisions are allowed.

| Field | Contract |
|---|---|
| `schemaVersion` | Exactly `1`. |
| `lessonId`, `revision` | Stable lesson identity and positive content revision. An update needs a higher revision unless the exact manifest is already installed. |
| `title`, `specialty`, `language` | Nonempty display metadata; language is `en`. |
| `contentType` | `USER_SOURCE` for learner-supplied content; `TECHNICAL_DEMO` only for explicitly nonmedical technical demonstrations. |
| `sources` | Exact source identities, checksum, supplied-source attestation and cited excerpts. |
| `facts` | Stable fact IDs, complete statements and exact source quotations. |
| `parts` | Coherent subsets of facts, objectives, illustration and two separate measured narration tracks. |
| `symbols` | Original scene objects, meanings, source fact IDs and normalized image regions. |
| `questions` | Image recall, occlusion, tap-symbol and/or multiple-choice variants mapped to facts. |
| `assets` | Complete, exact file inventory with media type, byte count and SHA-256. |
| `narration` | Breeze TTS 2 / CPU provenance with exact source revision, standard Q8_0 model and shared voice hashes. |
| `quality` | Explicit source coverage and listening review flags, reviewer and notes. |

## Sources and facts

A source is `{id, title, sha256, userProvided, excerpts}`. `excerpts` maps meaningful
locators such as `page 12, table 2` or `passage 4` to exact supplied text. The SHA-256
identifies the original file; original PDFs are not included in packages.

A fact is `{id, text, sources}`, where each reference is
`{sourceId, locator, quote}`. The quote must be a nonempty, exact substring of the
cited excerpt. Every fact must have at least one reference. All source entries in
a `USER_SOURCE` lesson must have `userProvided: true`.

The excerpt matching checks traceability; it does not prove a rewrite preserves
meaning or that every source fact was inventoried. Human coverage review is
required. No external medical website is an allowed source. Fictional mnemonic
story events must not introduce unsupported medical claims.

## Parts, audio and synchronization

A part is `{id, title, objectives, illustrationPath, factIds, explanation, story}`.
The union of part fact IDs must equal the full lesson inventory. Both modes in
every part must cover exactly that part's facts. Their audio files are separate.

A track is `{assetPath, durationMs, segments, captions, cameraCues}`:

- Each segment is `{id, startMs, endMs, factIds, symbolIds, text}`.
- Each caption is `{id, startMs, endMs, text}`.
- Each camera cue is `{startMs, endMs, target, easing}`. Target is
  `{x, y, width, height}`, normalized to the full image, origin at top left.
- Easing is `LINEAR` or `EASE_IN_OUT`. Cues interpolate from the previous focus.
- Segments and captions are ordered, contiguous and span the complete track;
  cue intervals cannot overlap or exceed the track. Times are integer milliseconds.
- WAV format is RIFF PCM16, mono, 24,000 Hz. The importer verifies actual frame
  counts, nonzero PCM and 60,000–240,000 ms per track. Declared and measured
  duration must agree to within 1 ms.

Media3's current **content** position is the only playback clock. The timeline
samples it after a seek and at each speed; UI elapsed timers do not advance the
scene. Narration switching maps the first fact in the active segment into the
other mode and preserves relative progress within the matched segment. Repeated
facts select the first destination occurrence. Captions in the current production
toolkit are aligned to actual generated segments, not individual words.

Reduced motion holds the full scene still. Captions and highlights continue.
Manual pinch/drag exploration temporarily holds the current focus; “Follow scene”
returns to synchronized camera movement. Switching modes resets manual exploration.

## Symbols and questions

A symbol is `{id, partId, label, meaning, factIds, region}` and can only reference
facts within its part. Regions must be finite, positive and fit completely inside
the image. Inspect the original artwork before authoring hotspots.

A question is `{id, factId, partId, type, prompt, answer, explanation, symbolId,
choices, correctChoiceId}`. Types are `IMAGE_RECALL`, `IMAGE_OCCLUSION`,
`TAP_SYMBOL`, `MULTIPLE_CHOICE`. A tap/occlusion question needs a related symbol.
An MCQ has 2–6 unique choices `{id, text}` and exactly one valid `correctChoiceId`.
Every fact needs at least one `IMAGE_RECALL` question for initial learning and
relearning. Eligible types rotate after graduation to review. Incorrect objective
answers always rate Again; other answers offer Again/Hard/Good/Easy.

Scheduling is per fact. Text and sorted source references form its SHA-256
fingerprint. Higher package revisions preserve cards with unchanged fingerprints;
changed facts restart learning, removed facts leave the active queue, and old
review logs remain as history until the lesson is deleted. Playback progress is
preserved only when the part's fact inventory/fingerprints and the mode's actual
audio checksum/duration all remain unchanged. Bookmarks survive updates.

## Provenance and review gates

`narration` includes `engine: "Breeze TTS 2"`, `backend: "CPU"`, a 40-character
`codeCommit`, the exact standard Q8_0 `modelSha256` from `tools/breeze/versions.json`,
and a 64-character `voiceSha256`. Hashes/attestations document provenance; they are
not a cryptographic signature proving who generated a package.

`quality` contains `sourceCoverageReviewed`, `audioReviewed`, `reviewer`, `notes`.
`USER_SOURCE` packages require both reviews true and a nonempty reviewer.
Technical demos may remain explicitly unreviewed and are labelled in the app.
Never claim an unreviewed technical package is a finished medical lesson.

## Limits and transactional import

| Limit | Value |
|---|---:|
| ZIP compressed bytes | 256 MiB |
| Expanded bytes | 512 MiB |
| Manifest bytes | 1 MiB (below the Android SQLite row window limit) |
| Individual asset | 32 MiB |
| Entries / assets | 512 / 500 |
| Sources / parts / facts / questions | 100 / 100 / 5,000 / 20,000 |
| PNG dimensions | At most 4096 × 4096; at most 16,777,216 pixels |
| Compression ratio per asset | At most 200:1 |
| JSON depth | At most 64 |

The importer checks central and local ZIP paths, encryption flags, symlink file
types, declared and actual expansion, CRC32, SHA-256, manifest references and media
format/duration. ZIP64 and multipart ZIPs are not supported. Every file must be
declared and used. Android additionally attempts a bitmap decode before publishing.

Imports first validate in a new private staging directory. Media then moves to a
unique immutable folder and Room changes commit together. A failure removes the
new files and leaves the prior revision intact. Startup recovery removes orphaned
staging/old folders. Player callbacks include the expected manifest hash and unique installation folder so an
old playback session cannot overwrite the progress for new content.

## Backup format

App-created backups are separate ZIPs containing `backup.json` and nested validated
lesson ZIPs under `lessons/<lessonId>.zip`. They include bookmarks, positions,
completion, FSRS state, review history and settings. The app accepts at most 1 GiB,
100 lessons, 100,000 cards/log rows and 20,000 progress rows, with 16 MiB metadata.
Exact inventories, references, hashes, timestamps, ratings and scheduler states
are checked before replacing Room data in one transaction. Restored settings are
journaled in Room and then applied to DataStore; interrupted application retries
on next startup. An invalid backup leaves existing data intact.

Exports contain source quotations and generated media. Use the Android document
picker to save the backup somewhere you control. Backups are not Anki collections.
See [production instructions](../tools/production/README.md) for a complete authoring
example and the shared JVM validator command.
