# Original visual mnemonic drawing rules

These are internal authoring rules for future agents. The user's
[showcase PDF](https://drive.google.com/file/d/1qF20QIYVvoYNev13AZVkZooEZDDE5evA/view)
is a visual reference, never a medical source. Its earlier review informed the
direction below; this Studio implementation does not constitute a new page-by-page
review or permission to copy the reference scenes. Keep the PDF and generated
art outside Git. If a future task depends on particular pages, inspect those
pages and their images before claiming fidelity.

## Start with meaning

Make one readable setting with a short, memorable event. Give each fact a
recognizable character, prop, action or spatial relationship. The scene should
work as a picture before its caption explains it. Use a limited, consistent
symbol vocabulary and preserve a stable fact-to-symbol map. A visually amusing
detail is useful only when its intended association can be explained clearly.

The medical explanation states the source facts plainly. The story describes
the same facts through the scene's characters and actions. Do not convert story
invention into a medical claim. Preserve quantities, units, exceptions and
conditions in the fact inventory and scripts even when a single prop cannot
encode all of them. Plan the lesson's full fact inventory and reading path
before generating its one image; preserve precise details in the scripts and
source links rather than hiding them in illegible picture detail.

## Drawing and composition

- Use clear cartoon silhouettes, expressive poses and readable interactions.
  Separate the focal objects from decorative texture and distant scenery.
- Keep dark, confident outlines; use a consistent outline weight relative to
  object size, broad color areas and restrained cel shading. Original vector
  scenes can use the same principles without pretending to be generated art.
- Choose one eye level, perspective, key-light direction and shadow softness.
  Keep the ground plane and contact points consistent across the scene.
- Use a controlled palette: calm background colors, warm focal accents and
  sufficient luminance separation. Color alone must not carry a fact.
- Arrange a clear visual reading path through the fact sequence. Give important
  symbols breathing room and allow the camera to focus without revealing only
  an unrecognizable fragment.
- Keep labels brief and legible. Put precise names, values and source references
  in editable text/captions rather than trusting generated lettering.
- Create new characters, poses, props and environments. Do not trace showcase
  compositions, reuse brand logos or copy an existing character ensemble.

## One complete image per lesson

Record the scene's canvas ratio, camera height, horizon, perspective, palette,
line treatment, light direction and
intended object positions/sizes. Map all lesson facts to visible symbols, then
include the complete composition in **one image-generation call**: background,
characters, props, interactions and shadows together. The default has no
separate background or transparent-cutout generation stages.

Inspect the finished picture for factual counts, readable symbols and coherent
composition. Import it with `new --image`; retain the original dimensions and
use the same picture throughout the lesson. Add source-linked hotspot bounds
as unpainted `rect` nodes (`visible: true`, `fill: "none"`, `stroke: "none"`)
with `factIds`. Use these regions for camera focus, highlights and recall.

## Optional independent layers

Use separate artwork only when independent object movement is specifically
needed. Reuse one composition specification in every prompt and use approved
scene references to maintain consistency.

For this optional workflow, generate the background with object placement areas
clear, then generate each character or object separately with a **real transparent
background**, a complete uncropped silhouette and enough transparent margin.
Request the same perspective, palette, light and cartoon treatment every time.
Do not accept a painted checkerboard, white rectangle or faint opaque halo as
transparency. Inspect alpha numerically and visually at the composited scale.

Keep an object's attached details in its layer if they must move together.
Separate shadows or occluding foreground scenery when their behavior requires
independent placement. Record the stacking order and motion pivot. Use original
asset names that describe the object; medical source provenance belongs in the
fact inventory, not an invented image filename.

Studio's layer export can split an already editable scene into raster layers.
It cannot recover hidden background pixels or independently redraw objects from
a flattened image. Use real layer generation or existing independent vectors.

## Motion

For the complete-image workflow, use gentle camera focus tied to the current
fact, such as an approximately 2–4% emphasis zoom. Optional independent layers
can use a few pixels of drift or a brief rotation. These are default art
choices, not clinical or learning-effectiveness claims. Avoid
constant bouncing, abrupt full-scene movement and motion that changes a factual
count or relationship. Keep the silhouette legible throughout the movement.

Sample transformations from the actual narration position so backward seeks
and speed changes remain deterministic. Align explanation and story by shared
fact IDs, not equal timestamps. Reduced motion keeps the still scene and all
essential captions/highlights. A complete image supports camera movement in
both package schemas. Independent object motion uses the optional transparent
layer export and schema-2 production bridge.

## Inspect before delivery

Check the full scene and representative camera frames for contact shadows,
occlusion, symbol identity and readability at phone size. For optional layers,
also inspect each layer, recompose it at its recorded coordinates and compare
the result with the base illustration, including transparent edges. Review the
actual spoken scripts against the source and rendered symbols. File integrity and
successful rendering do not prove source completeness or successful learning.

Earlier cardiac demonstrations used independently generated objects. That
history does not require separate cutouts for new lessons. Artwork completion
does not establish narration quality, source approval or device acceptance.
