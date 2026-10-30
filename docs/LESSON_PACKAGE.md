# Lesson package — version 1 draft

This document establishes the interface direction. It is not yet a frozen schema
or an implemented importer. The `lesson-model` module contains only the first
in-memory types and invariants; JSON serialization, archive validation, and the
remaining entities are deferred.

## ZIP layout

```text
manifest.json
images/<part-id>.png
audio/<part-id>/explanation.wav
audio/<part-id>/story.wav
captions/<part-id>/explanation.vtt
captions/<part-id>/story.vtt
```

Assets are relative to the ZIP root. No executable code is permitted. Captions
use WebVTT timestamps; manifest timing is integer milliseconds. Supported image
and audio codecs and the precise JSON schema will be fixed before import work.
Actual lesson ZIPs are delivered separately, never committed to this repository.

## Planned manifest entities

| Entity | Required information |
| --- | --- |
| Header | `schemaVersion: 1`, stable lesson ID, content revision, title, specialty, `language: "en"` |
| Sources | Stable source ID, learner-supplied document/text title |
| Facts | Stable fact ID, exact medical meaning, source ID and page/passage locator |
| Parts | Stable part ID, title, objectives, illustration, ordered fact IDs, both narration tracks |
| Tracks | Audio asset, measured duration, caption asset, ordered segment IDs |
| Segments | Stable ID, start/end milliseconds, fact IDs, symbol IDs, narration text |
| Symbols | Stable ID, label, source-backed meaning, fact IDs, image and normalized region |
| Camera cues | Track/segment, start/end milliseconds, normalized focus region, easing |
| Questions | Stable ID, fact ID, type, prompt, image/symbol references, answer, source-backed explanation |
| Assets | Relative path, media type, uncompressed byte length, SHA-256 checksum |

IDs must remain stable across repackaging. Review history is separate from lesson
content. Later lesson updates must retain scheduling for unchanged facts and
return changed facts to learning.

## Initial code invariants

- `SourceReference` requires a source identifier and locator. `Fact` requires at
  least one such reference. This records provenance; it cannot verify medical
  accuracy or whether the original source was faithfully preserved.
- `LessonPart` requires nonempty facts with unique IDs within that part, plus
  separate explanation and story tracks. `NarrationMode` selects either track.
- `NarrationTrack.durationMs` accepts 60,000–240,000 inclusive. A future production
  validator must measure the actual audio, verify Breeze generation, and reconcile
  captions/segments. A declared duration alone is insufficient.
- `ImageRegion` uses top-left origin and normalized x/y/width/height. All values
  must be finite, dimensions positive, and the region contained within the image.

Asset paths currently remain untrusted strings. Never open or extract a package
using these constructors alone.

## Import requirements for a later increment

Validate the version, archive entries, checksums, media formats, duplicate IDs,
asset references, all fact/segment/symbol/question relationships, and timing
before committing any data. Reject absolute paths, traversal, backslashes,
symlinks, encrypted entries, collisions, and unexpected executable content.
Enforce entry-count, compressed and expanded size limits during streaming as well
as before extraction; numeric limits must be agreed before implementation.

Extract into a private staging directory, then publish atomically only after all
checks succeed. Failed imports must remove staging data and preserve existing
lessons and review history. No package parsing, extraction, or persistence is
implemented in the first checkpoint.
