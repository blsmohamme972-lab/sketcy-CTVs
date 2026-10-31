# Lesson package schema 2

Android 0.3 reads schemas 1 and 2. Version 0.2 reads only schema 1. Use the
separate Sketcy Preview APK for the new demonstration files. The ZIP still has
`manifest.json` at its root, with declared, checksummed PNG/WAV assets beneath
`images/` and `audio/`. All existing bounded archive, PCM duration, exact quote,
fact coverage and question checks remain in force.

## External medical demonstrations

`contentType: EXTERNAL_REVIEW` is an explicit demonstration policy, authorized
by the user for testing public-source examples. It requires schema 2, sources
with `userProvided: false`, valid HTTPS `externalUrl` attribution, source hashes
and exact quoted evidence. `quality.notes` must state review limitations.
False human source/listening flags are allowed for this visibly labeled review
category. Setting either review flag requires a named reviewer; the production
bridge never sets them. This category is not approved clinical teaching.

`USER_SOURCE` continues to require every source to be user-provided, both review
flags true, and a reviewer. `TECHNICAL_DEMO` continues to mean nonmedical test
material. Do not relabel medical content as a technical demo or claim a public
article came from the learner. Article snapshots for these introductory examples
cover a selected fact inventory, not every fact in an entire public website.

## Independent objects

A part can add `scene` alongside its flattened `illustrationPath`:

```json
{
  "width": 1600,
  "height": 900,
  "backgroundPath": "images/background.png",
  "layers": [{
    "id": "example-object",
    "assetPath": "images/01-example-object.png",
    "region": {"x": 0.2, "y": 0.3, "width": 0.25, "height": 0.3},
    "symbolId": "example-symbol",
    "pivotX": 0.5,
    "pivotY": 0.5,
    "explanation": [],
    "story": [
      {"atMs": 0, "dx": 0, "dy": 0, "scale": 1, "rotation": 0},
      {"atMs": 1800, "dx": 0, "dy": -0.005, "scale": 1.04, "rotation": -1},
      {"atMs": 4000, "dx": 0, "dy": 0, "scale": 1, "rotation": 0}
    ]
  }]
}
```

The layer list is back to front. Region coordinates are fractions of the complete
scene. Translations are also scene fractions; pivot coordinates are fractions
within the layer. Rotation is in degrees. The bridge preserves the exported
pivot, including the transparent crop padding. The thumbnail is used for the
library, exploration and recall. Playback draws the background and independent
layers, with symbol highlights under the same object transform.

The scene has 1–16 layers, a maximum of 4,194,304 canvas pixels, and separate
background/thumbnail assets of exactly the declared size. Linked symbols must
belong to the part and fit their layer. Each symbol can move with only one layer.
All PNG paths are declared assets. Android decodes images and checks that each
object contains visible and transparent pixels; fully opaque or empty objects
are rejected. The player downsamples cached images instead of decoding per frame.

Keyframes must be finite, unique, ordered and within the measured track. Gentle
limits are translation ±0.1 scene units, scale 0.9–1.12 and rotation ±10 degrees;
the delivered examples use much smaller motions. Smooth interpolation begins
at the base pose if no zero key is specified, and holds the last key afterward.
Every sample is a function of Media3 position and narration mode. A backward seek
cannot accumulate drift. Reduced motion always returns the base pose and full
camera view while keeping captions/highlights active.

## Studio production path

1. Create the source/fact-linked scene with `studio/agent.mjs`. Use stable `--id`
   values on `new` and `add-image` before generating the narration plan.
2. Generate both tracks through the pinned Breeze Q8_0 CPU runner. Keep the ledger
   and original PCM; never pad, replace or speed-adjust output to meet duration.
3. Attach the actual WAVs in Studio, then patch captions and object keys from the
   ledger's measured segments. Automatic cue rescaling alone is draft timing.
   Optional `cameraDurationMs` lets a 1.4-second transition settle while the
   segment caption continues; the production camera uses this 1.4-second pattern.
4. Export `layers` and `handoff --part-id <measured-part-id>` outside Git.
5. Run the bridge:

```sh
python3 tools/production/studio_package.py \
  --handoff /private/lesson/handoff \
  --layers /private/lesson/layers \
  --generation /private/breeze-run \
  --output /private/lesson-demo.zip
```

The bridge checks exact script/fact/symbol links and cue boundaries against the
generation ledger; verifies PNG hashes, dimensions, ordering and crop placement;
converts pixel translations into scene fractions; preserves pivots; and calls the
existing CPU packager and Kotlin validator. Exported handoffs remain drafts and
retain false review flags. A successful ZIP parse is not a listening or device
pass. Keep all model weights, generated media, source snapshots and projects out
of Git; preserve those deliverables separately.
