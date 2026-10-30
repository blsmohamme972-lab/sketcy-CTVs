# Playback timing core

Implemented in `lesson-model/.../PlaybackTimeline.kt`. This is pure Kotlin with
no Android, Media3, audio-generation, image-rendering, or JSON dependencies.
The app's screens do not yet consume it.

## Inputs and outputs

`PlaybackTimeline` combines one existing `NarrationTrack` with ordered lists of:

- `NarrationSegment`: stable ID, start/end milliseconds, one or more fact IDs,
  and optional symbol IDs to highlight.
- `Caption`: stable ID, start/end milliseconds, and nonblank display text.
- `CameraCue`: start/end milliseconds, normalized target region, and easing.

The default initial camera focus is the full illustration. `frameAt(positionMs)`
returns a `PlaybackFrame` with the clamped audio position, current caption text,
segment ID, symbol IDs to highlight, and interpolated focus region. Missing
captions/segments return null and no highlights. Camera focus holds between cues.

Intervals include the start and exclude the end: `[startMs, endMs)`. Adjacent
intervals are allowed. Gaps are allowed and clear captions/highlights; overlapping,
reversed, negative, zero-length, unsorted, and beyond-duration intervals fail at
construction. Each collection is checked independently. Segments must be present;
captions and camera cues are optional while authoring the prototype. Completed
lesson-package validation must require all deliverable assets later.

The timeline detaches its lists from mutable authoring inputs when constructed.
Treat its exposed Kotlin `List` properties as read-only. Segment and caption IDs
must be nonblank and unique in their respective track collections; fact/symbol
references within a segment must also be nonblank and unique.

## Camera motion and seeking

Each cue starts from the preceding cue's settled target, or the initial focus for
the first cue. `LINEAR` interpolates all four region coordinates. `EASE_IN_OUT`
uses smoothstep, `t²(3 − 2t)`, to ease movement at both ends. At the cue end, focus
equals its target exactly. Reduced motion returns the initial focus at every
position while captions and symbol highlights continue to advance.

Every result depends only on the requested audio position and immutable timeline
metadata. Backward seeks, pauses, and changing sampling frequency cannot accumulate
timing drift. This is verified in JVM tests. Actual player synchronization and
screen rotation still need Android integration and device tests.

## Switching narration modes

`PartPlayback` takes a `LessonPart`, its explanation and story timelines, and the
set of known symbol IDs. Each mode must reference exactly the part's source-backed
fact inventory, and all segment symbol IDs must exist in that set. Declared track
asset paths/durations must match the part. This does not inspect audio or verify
the truth/completeness of narration text.

Call `switchMode(from, to, positionMs)` to obtain a `NarrationSeek`:

1. Clamp the source position to the track duration.
2. Use the active segment; in a gap, use the upcoming segment; after the last
   segment, use that final segment.
3. Match the source segment's first fact ID to its first occurrence in the other
   track. Story ordering may differ from explanation ordering.
4. Preserve the relative position within the matched segments, rounded down to
   whole milliseconds. A source gap maps to the upcoming segment's start.

Selecting the already active mode preserves its clamped position and returns
`factId = null`. Repeated facts deliberately select the first target occurrence;
segments containing several facts use their first fact as the anchor. Authors
should split segments at fact boundaries when more precise switching is needed.
This policy is deterministic but does not provide word-level alignment.

## Next Media3 integration

The player adapter should pass Media3's content position directly to `frameAt`:

```kotlin
val frame = playback.timeline(activeMode).frameAt(
    positionMs = player.currentPosition,
    reducedMotion = reducedMotionEnabled,
)
```

Media3 already advances its position at the selected playback speed. Use that
position as the single clock for captions, focus, and highlights. Poll at a
lifecycle-aware frame cadence while playing; also resample after a seek, pause,
mode change, or recreation. Keep the selected media item and timeline consistent
when applying `NarrationSeek`; switch to the destination item's requested start
position and publish the matching mode when that item is active.

Rendering must translate normalized focus coordinates to the displayed image's
aspect ratio, provide manual exploration, and respect reduced motion. Persisted
settings, lifecycle ownership, actual audio duration checks, caption-file parsing,
symbol geometry lookup, and all Android player controls remain future work.
