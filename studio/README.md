# Sketcy Studio 0.1 — internal lesson authoring

Studio is the assistant's illustration and composition tool. It lives in this
repository so future agents can build, revise and inspect lesson scenes. **It is
not part of the student Android app.** Students receive finished lesson packages;
they do not need Node, Python, a browser editor or an authoring account.

The first milestone provides editable SVG artwork, local raster layers, source
fact links, two narration timelines, camera previews and independent object
motion. It is a working foundation, not full Adobe Illustrator compatibility.
Read [the staged plan](../docs/STUDIO_PLAN.md),
[agent instructions](AGENTS.md), [the format](../docs/STUDIO_FORMAT.md) and
[drawing rules](../docs/ART_DIRECTION.md).

## Authoring commands

Use Node 22+ and Python 3.10+. Project creation, patches, structural validation
and SVG export use Node alone. PNG rendering and image inspection use the same
SVG renderer in headless Chromium:

```sh
cd studio
npm ci --ignore-scripts
npx playwright install chromium --only-shell
cd ..
```

On a clean Linux authoring machine, Playwright's `install --with-deps chromium
--only-shell` also installs required system libraries. Browser installation
needs network access once. Projects and media remain local during authoring.
An existing `PLAYWRIGHT_BROWSERS_PATH` may select a separately managed cache.

All paths below are examples of private directories **outside the checkout**.
Existing files are protected; use a new revision path, or `--force` when an
intentional replacement is appropriate.

```sh
node studio/agent.mjs new --demo --out /private/workshop.sketcy-studio.json
node studio/agent.mjs validate --project /private/workshop.sketcy-studio.json
node studio/agent.mjs render --project /private/workshop.sketcy-studio.json --out /private/workshop.png
node studio/agent.mjs layers --project /private/workshop.sketcy-studio.json --out-dir /private/workshop-layers
node studio/agent.mjs handoff --project /private/workshop.sketcy-studio.json --out-dir /private/production
```

| Command | Result |
| --- | --- |
| `new --title "Scene" --out …` | Empty portable scene; `--demo` loads the original nonmedical Lantern Workshop |
| `patch --project … --ops … --out …` | Validated batch of scene, fact, source and timeline edits; the input is preserved |
| `add-image --project … --image … --out …` | Decoded PNG/JPEG/WebP embedded as an independent layer; reports actual transparency |
| `add-image … --background` | Places and locks a background layer below the other artwork |
| `add-audio --project … --audio … --mode explanation --out …` | Measures an actual WAV and attaches it to one track; does not certify its origin or quality |
| `render --project … --out …` | Base illustration as SVG or PNG |
| `render … --mode story --time-ms 45000` | Deterministic camera and object frame; `--reduced-motion` holds the base pose |
| `layers --project … --out-dir …` | Background, transparent element PNGs, placement/pivot/motion metadata and SHA-256 hashes |
| `handoff --project … --out-dir …` | Scene PNG, authoring JSON, two-track narration plan and explicit draft timing |

`add-image` also accepts `--x`, `--y`, `--width` and `--name`. Width defaults to
the smaller of the original image width and artboard width. Keep each moving
object at the top level; static details can be grouped with it. Layer export
rejects interleaved backgrounds and nested animation that would be lost when a
group is rasterized. Backgrounds must be static and below all elements.

## Optional visual workspace

```sh
python3 studio/server.py
```

Open `http://127.0.0.1:4173`. The server binds only to loopback and serves only
Studio assets. It has no upload, shell, remote-generation or credential API.
The browser UI has no runtime npm dependencies or CDN requests.

The workspace has selection, multiselection, marquee, move/resize/rotate,
pan/zoom, snapping, alignment, visibility/locking, grouping/isolation,
duplication, undo/redo, rectangle, ellipse, text, freehand, pen paths and direct
Bézier anchor/handle editing. The inspector connects objects to facts and edits
their transforms and keyframes. Source and fact dialogs retain exact excerpts.

The two timeline modes have separate scripts, cues, camera focus, motion and
WAV attachments. With audio attached, preview samples `HTMLMediaElement.currentTime`;
without it, the interface explicitly says **Silent motion preview**. Imported
WAVs must be 24 kHz mono PCM16 with nonzero samples. Short 1–59-second drafts
can be inspected, but lesson readiness requires each actual track to last
60–240 seconds. Attaching a changed-duration WAV rescales cues as a **manual
draft**, not measured speech alignment.

Save downloads a portable `.sketcy-studio.json` with embedded assets. IndexedDB
stores one local recovery copy; browser cleanup, quota limits or a different
origin can remove that copy. Keep explicit project revisions outside Git.
SVG/PNG exports omit selection controls, captions and editing overlays.

## Production handoff

`handoff` produces:

- `images/scene.png`: real flattened base illustration/thumbnail for Android.
- `authoring.json`: `lesson` plus an `imageFiles` mapping to the actual PNG.
- `narration-plan.json`: distinct explanation/story segment arrays with fact
  and symbol IDs, for the existing Breeze CPU runner.
- `studio-handoff.json`: readiness issues, exact source references, draft
  timelines and `releaseReady: false`.

Continue with [the production guide](../tools/production/README.md). Generate
real narration using the pinned Breeze TTS 2 standard Q8_0 CPU path, preserve its
generation ledger, listen to every sentence, review source completeness, and
package using the existing Kotlin validator. The packager uses measured segment
boundaries from that ledger; Studio draft cue times do not override them.

The handoff deliberately starts with both review flags false. It is **not** an
Android ZIP. Version 0.3 adds a [schema-2 bridge](../docs/LESSON_PACKAGE_V2.md)
for measured layer exports and explicitly labeled `EXTERNAL_REVIEW` packages.
Schema 1 remains a single-image format. Use stable `--id` values with `new` and
`add-image`, and `handoff --part-id <id>` matching the CPU generation plan.
Source `externalUrl` attribution survives export. Patch actual segment start/end
times after attaching WAVs; `cameraDurationMs: 1400` can settle a camera move
while its longer caption remains visible. The bridge rejects guessed timing.

```sh
node studio/agent.mjs layers --project /private/measured.sketcy-studio.json --out-dir /private/layers
node studio/agent.mjs handoff --project /private/measured.sketcy-studio.json --part-id part-01 --out-dir /private/handoff
python3 tools/production/studio_package.py --handoff /private/handoff --layers /private/layers --generation /private/breeze-run --output /private/lesson-demo.zip
```

## Verification

```sh
cd studio
npm run check
npm run format:check
npm run test:browser
python3 -m py_compile server.py
```

Core checks exercise geometry, history, source preservation, timing, WAV parsing
and the actual agent subprocess. Browser checks operate Chromium's UI and media
clock, save/reopen actual PNG/project files, export and recompose separate
layers, render deterministic frames, and inspect the production handoff.
Transient synthetic PCM is used only as a test fixture, never as lesson narration.
The pinned workflow is [.github/workflows/studio.yml](../.github/workflows/studio.yml).
Exact results and exclusions are in [VERIFICATION.md](../docs/VERIFICATION.md).

## Boundaries of this milestone

No `.ai`/PSD import, clipping masks, boolean path operations, gradients, brush
library, advanced typography, multiple artboards, collaborative editing or
automatic image/TTS job runner is implemented. SVG export is supported; importing
arbitrary SVG is deliberately outside this format. Raster imports remain raster
images; the editor does not invent editable vector detail from a generated PNG.
System fonts may render differently on another operating system, so final PNGs
must be inspected. Desktop Chromium is verified; Safari, Firefox, mobile editing
and assistive-technology acceptance are not established by these tests.

The bundled Workshop is original neutral vector code with silent draft tracks.
It is separate from the earlier narrated Lantern Library Android demo. Neither
the editor nor its test fixtures completes the ten cardiac lessons or the first
three cardiac layer packs.
