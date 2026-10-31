# Instructions for agents using Sketcy Studio

Studio is an **internal authoring tool for the assistant**, per the user's
explicit direction. Never add it to student navigation, require a student to
operate it, or put authoring dependencies in the APK. Work alone and use English
unless the user changes those instructions.

## Read and preserve

Read the repository HANDOFF, README and PLAN, then `studio/README.md`,
`docs/STUDIO_FORMAT.md`, `docs/ART_DIRECTION.md` and the production guide. Inspect
the current checkpoint before deciding what exists. Do not equate Studio
features with Android package support, successful CPU synthesis with listening
quality, or an Android build with a device pass.

Use the CLI for repeatable scene creation and edits; the browser workspace is an
optional inspection/debug surface. It is not necessary to ask the user to make
selections in the editor. Use existing user authorization and finish the scoped
work without routine permission stops.

## Build one image for one lesson

1. Inventory the source. Preserve every fact, exact locator and quote. Hash the
   original source bytes. A showcase PDF is an art reference only. The user
   authorized external medical sources for the separate testing demonstration;
   label these `EXTERNAL_REVIEW`, retain their real origin and do not disguise
   them as learner-supplied sources or nonmedical technical demos.
2. Plan one complete scene for the lesson. Map every fact to its character,
   prop, action or location before generating artwork. Include the background
   and all characters and props in one image-generation call. The default is
   one complete image per lesson, with no separate background/cutout stages.
   Studio imports the result; it does not call image generation itself.
3. Create the private project in one command:
   `node studio/agent.mjs new --image /private/lesson.png --title "Lesson" --id lesson-01 --out /private/lesson.sketcy-studio.json`.
   PNG/JPEG/WebP images must measure 64–4096 pixels on each axis. The project
   uses the image's original canvas dimensions and one locked background image
   at the identity transform, preserving transparency without cropping.
4. Use stable, descriptive fact and hotspot IDs in patches. Set the actual
   content policy with `set-policy`; image import does not establish source
   origin. Add exact sources/facts and both tracks as a validated batch. Mark
   meaningful regions with `rect` nodes using `visible: true`, `fill: "none"`,
   `stroke: "none"` and linked `factIds`. Reference their IDs in cue `layerIds`
   for symbol links without changing the picture. Keep revision outputs.
5. Create distinct explanation and story scripts. Set per-track cue arrays and
   gentle, deterministic camera focus. Keep both tracks within 1–4 minutes once
   real Breeze audio exists. Timing based only on draft prose is not alignment.
6. Render the base scene and representative frames, including backward seeks,
   mode changes and reduced motion. Inspect the full picture and its symbols
   at phone size. SVG/PNG snapshots alone do not prove animation playback.
7. Generate the handoff for this one scene. Continue through pinned Breeze CPU
   production, actual measured audio, listening and source reviews. Package with
   `studio_package.py --handoff … --generation … --output …`; no layer export
   is required. One scene becomes one lesson package. A `.sketcy-studio.json`
   or handoff JSON is never a lesson ZIP.
8. Preserve project/media/source files privately. Commit only code, original
   neutral examples, tests and documentation. Update HANDOFF/README/VERIFICATION
   and verify the saved GitHub commit. Record incomplete acceptance honestly.

Separate transparent objects and `layers` export remain optional for a specific
need for independent object motion. In that case, use a shared composition
specification, real PNG alpha, top-level moving objects and the optional
`--layers` argument to `studio_package.py`. Inspect alpha, placement and
recomposition. Never pretend a
flattened picture contains independently editable or moving objects.

## Non-negotiable provenance

- No alternate TTS, quantization, GPU service, padded substitute audio or fake
  generation success. If Breeze CPU or its quality fails, pause audio work.
- Imported WAV metadata and nonzero PCM do not prove Breeze origin, intelligibility
  or correctness. Retain the actual generation ledger and listening findings.
- Never set source/listening approval flags just to satisfy a validator.
- External-source cardiac demonstrations use the explicit schema-2 review policy
  and preview app. Keep review flags false until reviewed. Do not remove
  source-origin validation or mislabel these as v1 nonmedical demos.
- Keep model weights, generated media, user PDFs/text and credentials out of Git.
  CLI output guards include parent symlink resolution; do not disable them for
  convenience. Browser downloads also belong outside the checkout.

## Editing this tool

Maintain shared model/renderer behavior between UI and CLI. Preserve schema
validation, escaped SVG text, loopback-only serving, actual audio-clock sampling
and deterministic transforms. Test a concrete regression or contract risk, then
stop optional testing once the scoped change is verified. Browser tests and
JavaScript tests are separate from Android JVM and device validation.
