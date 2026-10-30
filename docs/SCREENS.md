# Screen guide — implemented in 0.2.0

This describes implemented Compose behavior. No emulator or physical-device
visual acceptance is claimed; see [verification](VERIFICATION.md) for the
installation blocker and the remaining runtime checks.

Original visual direction: warm ivory, forest green, restrained gold, rounded
scene cards and serif section headings. System dark mode is supported. The
Lantern Library illustration is original nonmedical artwork, distributed with
the demo ZIP rather than bundled in Git or the APK.

## Library

A study shelf with full-scene previews, a title/topic/fact search, specialty
filters, bookmarks and two-track completion. Import opens Android's document
picker. The empty state explains the listen → explore → recall workflow without
invented medical lessons. Lesson updates are identified by stable IDs/revisions.

## Lesson overview

Title, specialty, fact count, objectives, source quotations and part cards.
Technical demos are explicitly labelled. Each part shows measured explanation
and story durations, Start/Resume and Explore symbols. Removal requires an
in-app confirmation because it deletes that lesson's local history and media.

## Player

Original scene, synchronized focus/highlights, explanation/story chips,
segment-level captions, scrubber, current/measured duration, ±10 seconds,
play/pause, speed choices, captions and still-scene controls. Source passages for
the current segment can be expanded. Media3 current position is the timeline
clock. Fullscreen hides app navigation; landscape places the scene beside the
scrollable controls. Pinch/drag explores the picture and Follow scene resumes the
camera. Rotation retains playback; leaving/backgrounding pauses it.

## Symbol Explorer

Tap a hotspot or choose a symbol by name. Focus, meaning and exact cited passages
appear together. Hide meanings supports recall without deleting source context.
Whole scene resets the focus; manual zoom/pan remains available.

## Review

Due facts, learned facts, recent ratings and next due time. Initial/relearning
image recall, image occlusion, symbol taps and MCQs conceal explanations until
reveal/submission. Tap questions include an accessible object-button alternative.
Incorrect objective answers force Again; the other ratings show FSRS interval
previews. Saved ratings update per-fact scheduling and immutable review history.

## Settings

Captions, reduced motion, narration speed and desired retention (80–97%, 90%
default). Export/restore uses Android's document picker. Restore explains that it
replaces local data and requests an in-app confirmation. Source policy, app
version, offline behavior and third-party notices remain visible.

Implementation files are in `app/src/main/java/com/sketcy/ctvs/ui/`. See
[VERIFICATION.md](VERIFICATION.md) for what was actually rendered/tested; a list
of implemented screens is not a claim that every accessibility or physical-device
scenario has been validated.
