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

## Build one lesson part

1. Inventory the source. Preserve every fact, exact locator and quote. Hash the
   original source bytes. A showcase PDF is an art reference only. The user
   authorized external medical sources for the separate testing demonstration;
   label these `EXTERNAL_REVIEW`, retain their real origin and do not disguise
   them as learner-supplied sources or nonmedical technical demos.
2. Create a private project with `new`. Use stable, descriptive layer and fact
   IDs in patches. Apply `add-source`, `add-fact`, `add-layer`, `update-layer`
   and `set-track` operations as a validated batch. Keep revision outputs.
3. Create original art with the authorized image-generation tool when bitmap
   artwork is needed. Generate a clean background and individual transparent
   objects with one shared composition specification. Do not use code to fake
   transparency on a generated opaque illustration. Studio imports and arranges
   actual PNG alpha; it does not call image generation itself.
4. Add each image with `add-image`. Use `--background` only for a static bottom
   background. Keep independently moving elements at the top level. Static
   vector details can share a group. Link fact IDs to meaningful objects.
5. Create distinct explanation and story scripts. Set per-track cue arrays and
   gentle, deterministic keyframes. Keep both tracks within 1–4 minutes once
   real Breeze audio exists. Timing based only on draft prose is not alignment.
6. Render the base scene and representative frames, including backward seeks,
   mode changes and reduced motion. Inspect the images. Export layers and check
   alpha, cropping, placement and recomposition before describing a layer pack
   as complete. SVG/PNG snapshots alone do not prove animation playback.
7. Generate the handoff. Continue through pinned Breeze CPU production, actual
   measured audio, listening and source reviews, and the existing package
   validator. A `.sketcy-studio.json` or handoff JSON is never a lesson ZIP.
8. Preserve project/media/source files privately. Commit only code, original
   neutral examples, tests and documentation. Update HANDOFF/README/VERIFICATION
   and verify the saved GitHub commit. Record incomplete acceptance honestly.

## Non-negotiable provenance

- No alternate TTS, quantization, GPU service, padded substitute audio or fake
  generation success. If Breeze CPU or its quality fails, pause audio work.
- Imported WAV metadata and nonzero PCM do not prove Breeze origin, intelligibility
  or correctness. Retain the actual generation ledger and listening findings.
- Never set source/listening approval flags just to satisfy a validator.
- External-source cardiac drafts need their own reviewed delivery policy before
  v1 Android import. Do not remove source-origin validation to bypass that gate.
- Keep model weights, generated media, user PDFs/text and credentials out of Git.
  CLI output guards include parent symlink resolution; do not disable them for
  convenience. Browser downloads also belong outside the checkout.

## Editing this tool

Maintain shared model/renderer behavior between UI and CLI. Preserve schema
validation, escaped SVG text, loopback-only serving, actual audio-clock sampling
and deterministic transforms. Test a concrete regression or contract risk, then
stop optional testing once the scoped change is verified. Browser tests and
JavaScript tests are separate from Android JVM and device validation.
