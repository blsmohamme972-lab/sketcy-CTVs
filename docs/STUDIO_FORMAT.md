# Studio authoring formats, version 1

These formats belong to the internal authoring tool. They are separate from
[Android lesson packages](LESSON_PACKAGE_V2.md). No executable code or network
asset URL belongs in a project.

## Portable project: `sketcy.studio.v1`

| Field | Meaning |
| --- | --- |
| `schema`, `id`, `title` | Exact schema name, stable identity and scene title |
| `width`, `height`, `background` | Artboard pixels, 64–4096 per axis; hex color or `none` |
| `contentType` | `TECHNICAL_DEMO`, `USER_SOURCE`, or explicitly external `EXTERNAL_REVIEW` |
| `nodes` | Back-to-front scene graph; children use the same order inside groups |
| `assets` | ID-keyed embedded PNG/JPEG/WebP/WAV data URLs and measured metadata |
| `sources` | Original source identity, title, SHA-256, `userProvided`, optional HTTPS `externalUrl`, and exact locator-to-excerpt map |
| `facts` | Stable fact IDs, complete text and `{sourceId, locator, quote}` references |
| `tracks` | Separate `explanation` and `story` objects |
| `quality` | Review attestations; exporting a new production draft resets approvals |

`makeNode(type, properties)` supplies the common defaults. Types are `rect`,
`ellipse`, `path`, `text`, `image` and `group`. Every node has an ID, name,
affine `[a,b,c,d,e,f]` matrix, dimensions, opacity, fill/stroke, visibility/lock,
`factIds` and separate per-mode `motion` arrays. Top-level `role` can be
`background` or `element`; omitted roles are treated as elements. Groups contain
`children`. Images refer to an embedded `assetId`. Text uses a system serif,
sans-serif or monospace family. Path points have `{x,y}` and optional absolute
local-coordinate `in`/`out` control points; `closed` controls the closing edge.

Matrices map a local point to its parent's coordinates. Nested transforms are
multiplied without decomposing and losing skew. Grouping rewrites child matrices
to preserve their world positions. Ungrouping propagates fact links and cue
references, but rejects animated or non-opaque groups whose semantics would be
lost. Locked objects are excluded from normal destructive/edit operations.

Limits include 500 total nodes, 12 group nesting levels, 100 assets, 32 MiB per
asset, 96 MiB of decoded asset bytes and a 128 MiB project file. A 60-entry history
shares immutable media strings instead of copying asset bytes on every drag.
Large text/source inventories still need sensible per-part splitting. Import
validates the schema before replacing the current document, then decodes actual
images/WAVs and verifies their reported dimensions/duration.

The default `new --image` workflow creates one scene for one lesson from a
complete PNG/JPEG/WebP. The canvas matches the decoded image's original
dimensions (64–4096 per axis), `background` is `none`, and one locked image node
has `role: "background"` and the identity matrix `[1,0,0,1,0,0]`. The original
image bytes and transparency are retained in one embedded asset. Source policy,
facts and narration still need explicit authoring.

Symbol hotspots over this picture can be `rect` nodes with `visible: true`,
`fill: "none"`, `stroke: "none"` and linked `factIds`. Their transformed bounds
become normalized symbol regions in the handoff, while the rendered picture
stays unchanged. Cue `layerIds` refer to these node IDs. Setting `visible: false`
would omit a hotspot from symbol export.

## Timing

A track has `durationMs`, nullable `audioAssetId`, and ordered, non-overlapping
`cues`. Each cue contains `id`, `startMs`, `endMs`, `text`, `factIds`, `layerIds`,
`easing` (`LINEAR` or `EASE_IN_OUT`) and nullable normalized camera region
`{x,y,width,height}`. Cue intervals are half open; gaps clear captions/highlights.
Camera focus is sampled from time, with the previous focus held across gaps.
The viewport expands the normalized focus to the artboard aspect ratio and stays
inside the canvas, so a tall or wide target is not cropped to fill the frame.
Shared-fact switching selects the first matching target cue and preserves the
fractional position within the source cue, following the Kotlin timing contract.

Each object keyframe is `{atMs, dx, dy, scale, rotation}`. Offsets are in the
parent's coordinates; rotation uses degrees and scale is relative to the base
pose. Transform order is base artwork, scale/rotation about its bounding-box
center, then translation. Keyframes interpolate with smoothstep. Missing zero
keys imply the base pose. Reduced motion holds the full scene and base object
transforms while preserving captions and fact highlights.

WAV duration comes from 24 kHz mono PCM16 sample frames. Studio accepts 1–240
seconds for drafting; Android delivery requires 60–240 seconds for **both**
modes. Attaching a different-duration WAV rescales draft cues/keyframes and marks
the alignment `manual_draft`. It does not force-align spoken words. Preview
reads the media element's actual content position when audio is attached.

## Agent patches

`patch --ops` takes a JSON array. The complete result must validate before an
output is written. Unrecognized operations/properties fail; the input file is
unchanged. Use `new` for defaults rather than hand-writing an incomplete project.

```json
[
  {"op":"set-title","title":"A memorable scene"},
  {"op":"add-layer","layer":{"id":"cue-lantern","type":"ellipse","name":"Lantern cue","width":120,"height":160,"matrix":[1,0,0,1,500,260],"fill":"#e7b45d"}},
  {"op":"update-layer","id":"cue-lantern","changes":{"motion":{"explanation":[{"atMs":0,"dx":0,"dy":0,"scale":1,"rotation":0},{"atMs":6000,"dx":0,"dy":-4,"scale":1.025,"rotation":0}],"story":[]}}}
]
```

Other operations: `set-policy` with `contentType`; `set-canvas` with changed
dimensions/background; `add-source` with a source object; `add-fact` with a fact
object; `set-track` with `mode` and a complete track; `remove-layer` with `id`;
`group` with `ids` and optional `parentId`/`name`; `ungroup` with `id`.
`add-layer` can include a parent group ID. `update-layer` supports transforms,
paint, visibility, lock, fact links, motion, role and type-appropriate content;
it cannot change identity or node type. Inspect `agent.mjs` for the whitelist.

## Raster layer set: `sketcy.layer-assets.v1`

This optional format is used for independent object motion; the default
complete-image lesson needs no layer export. `layers` writes one full-size
`background.png` plus one transparent PNG for each visible top-level element,
ordered back to front. The background contains
the artboard fill and static background layers. Transparent crops use actual
browser glyph bounds plus conservative stroke padding, aligned to integer pixel
coordinates. The manifest records canvas size, background hash and each
element's filename, hash, `placement` box, normalized pivot, fact IDs and motion.
PNG dimensions equal the placement dimensions. Place the PNG's top-left at
`placement.x/y`; apply its motion about the recorded pivot. Base opacity is
already baked into the PNG and must not be applied twice.

Background layers must precede all elements. Nested animated children and
animated backgrounds are rejected before export: move each independent animated
object to the top level. Static groups become one raster layer. The project
remains the full editable source of truth. `androidV1IndependentMotion: false`
explicitly records that this layer manifest itself is not an Android package.
The schema-2 production bridge supplies Android scene metadata from it.

## Production draft: `sketcy.studio-handoff.v1`

The handoff preserves exact sources/facts, normalized symbol regions, generated
recall-question drafts, distinct narration segments and draft timeline data.
`releaseReady` and both lesson review flags are false. The CLI also writes the
real flattened PNG and an `authoring.json` object matching the existing
production toolkit's input shape. It never fabricates generated audio or its
ledger. No complete ZIP is produced at this stage.

Production must supply measured Breeze generation, human listening/source
reviews, and final package validation. The packager derives timing from measured
segments, not unmeasured `timingDraft` guesses. The measured bridge requires
Studio cue boundaries to match those segments and preserves the authored camera
targets. Do not relabel `EXTERNAL_REVIEW` medical drafts as `TECHNICAL_DEMO` or
`USER_SOURCE` to get them through an older importer.

## Measured production additions — 31 October 2026

Stable project/layer IDs can be supplied to the agent CLI with `--id` on `new`
and `add-image`. `handoff --part-id` preserves the exact generated part identity.
External-source handoffs use schema 2 and retain `externalUrl`; source origin
and review flags are never promoted. A cue can set `cameraDurationMs` between
1 and its interval length, allowing the camera to settle while the caption
continues. Legacy cues without it retain their previous interpolation behavior.

The measured production bridge accepts `--handoff`, `--generation` and
`--output` for the default complete-image path. It packages one scene as one
lesson using only `images/scene.png`, with no `scene` layer object. External
review lessons retain schema 2 and source attribution; compatible other lessons
retain schema 1. Both narration modes, source/fact links, camera cues and false
review flags remain intact.

Add `--layers` for optional schema-2 independent layer playback. The layer
export format still uses pixels and normalized pivots; the bridge converts
translations/placement into complete-scene fractions and verifies image hashes.
Measured WAV attachment alone still leaves cue rescaling as draft timing.
