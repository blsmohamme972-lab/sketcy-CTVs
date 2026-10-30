# Sketcy Studio — visual lesson authoring plan

User direction, 30 October 2026 (UTC): build an Illustrator-like editor inside this
repository, make the plan first, then implement without further questions. Work
alone. The goal is a strong editor for visual mnemonic lessons, not a claim of
full Adobe Illustrator feature parity. The user clarified that this is an
**internal authoring tool for the assistant and future agents**. It must not
appear in the student Android interface. Student delivery remains finished
lesson packages only.

## Product direction

**A scene is editable artwork plus meaning and time.** Authors arrange a clean
background, independent transparent character/object PNGs, vectors and labels;
connect objects to source-backed facts; and preview two narration tracks with
captions, camera focus and gentle object motion. Projects stay on the authoring
computer. Generated media, source documents and credentials stay out of Git.

The Android app remains Kotlin / Compose / Media3, API 26+. The new `studio/`
directory is a companion browser editor, served locally with Python. Native SVG
and small JavaScript modules provide editable vectors, crisp selection controls
and portable SVG export without a framework, CDN or paid dependency at runtime.
No Adobe code, branding or proprietary file format is copied.

## Milestone 1 — usable editing foundation (build now)

1. Original responsive workspace: tools, artboard, layer list, properties,
   source/fact panel and narration timeline. Include an original, nonmedical
   editable vector example and an empty-project option.
2. Select, multi-select, drag, resize, rotate, nudge, pan, zoom, grid snapping,
   layer order, visibility/locking, duplication, grouping, undo and redo.
3. Rectangle, ellipse, text, freehand and editable pen paths. Import local PNG,
   JPEG and WebP images, preserving genuine alpha transparency.
4. Versioned portable project JSON with embedded local assets, bounded input
   validation, IndexedDB recovery, explicit Save/Open, and SVG/PNG exports.
5. Source excerpts and fact IDs linked to scene objects; separate explanation
   and story cues; local WAV import; actual audio-position preview; shared-fact
   mode switching; seeking, speed, captions, focus and reduced motion.
6. Gentle object keyframes sampled deterministically at a requested position.
   An explicitly labelled silent preview is available before narration exists.
7. Export an authoring handoff and narration plan for the existing production
   tooling. Preserve exact quotes and false review flags. Do not label a Studio
   project or a draft handoff as an Android lesson ZIP.
8. Meaningful model, browser and export/import checks; reproducible CI; update
   README, HANDOFF and VERIFICATION; commit and verify the saved GitHub files.
9. An agent-facing CLI for creating, validating, inspecting and exporting scene
   projects, with a deterministic PNG render path and per-layer exports. The
   visual workspace is an optional authoring/debug surface, not a required
   student interaction.

Milestone 1 is implemented in `studio/`; observed checks and open acceptance
limits are recorded in [VERIFICATION.md](VERIFICATION.md).

## Milestone 2 — robust production bridge

- Import measured Breeze generation ledgers and retain code/model/voice hashes.
- Source-inventory review with coverage comparisons and revision history.
- Round-trip the supported Android package contract through the existing JVM
  validator, with real 1–4 minute audio and recorded human review.
- Extend the Android contract and renderer for independent object animation;
  version 1 currently renders one PNG per part. Do not silently discard layers
  while claiming that Android can animate them.
- Verify the first three cardiac layer packs with actual transparent cutouts,
  recomposition, listening and physical-device playback.

## Milestone 3 — advanced illustration tools

Add clipping masks, boolean path operations, richer Bézier editing, gradient and
brush systems, reusable symbol libraries, multiple artboards and larger-project
asset management. Each requires file-format migration and targeted tests.

## Milestone 4 — assisted production and delivery

Add explicit image-generation jobs and the pinned Breeze CPU job runner through
an optional local authoring service. Keep secrets out of browser projects and Git;
report failures and provenance. No alternate TTS, fake generation button, GPU
fallback or substitute narration. Desktop packaging and a hosted editor can be
considered after local authoring and data recovery are proven.

## First-delivery acceptance

- Open a project, edit vectors and independent images, save/reopen it without
  losing alpha, groups, fact links or motion.
- Undo/redo a whole pointer gesture; locked/hidden objects behave predictably.
- Reject malformed or executable project input without replacing the current
  document. Imported text is rendered as text; image URLs are local data only.
- Preview at the media element's current position; backward seeks and narration
  switches resample deterministically. Reduced motion preserves captions and
  highlights while holding the scene and objects still.
- SVG and PNG exports match visible artwork; editable project export preserves
  source data. No medical or listening approval is inferred from automation.
- Report browser checks separately from Android unit/emulator/device checks.

## Scope and source decisions

The user authorized public medical sources only for the separate ten-lesson
demonstration. That exception does not turn those sources into user-provided
evidence and does not bypass the current package importer. Future source lessons
still use the learner's material. The showcase PDF is an art reference, not a
medical source; original artwork is required. The three background drafts and
ten flattened scenes exist outside Git; their missing transparent layers and
narration must not be represented as completed by this editor milestone.

## Technical references

- SVG pointer coordinates use the inverse screen matrix:
  <https://developer.mozilla.org/en-US/docs/Web/SVG/Guides/Scripting>.
- Narration preview reads and seeks `HTMLMediaElement.currentTime`:
  <https://developer.mozilla.org/en-US/docs/Web/API/HTMLMediaElement/currentTime>.
- Android timing remains defined by `PlaybackTimeline.kt` and
  [PLAYBACK_TIMING.md](PLAYBACK_TIMING.md).
- Browser automation uses Playwright: <https://playwright.dev/docs/test-webserver>.
