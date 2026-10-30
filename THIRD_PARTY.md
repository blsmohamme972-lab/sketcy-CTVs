# Third-party code and tools

## FSRS v6

`lesson-model/.../FsrsScheduler.kt` is a Kotlin port of the canonical
[Open Spaced Repetition Python scheduler](https://github.com/open-spaced-repetition/py-fsrs/tree/9446cb06605c597a063aeee49f7d188d42e34dc2),
commit `9446cb06605c597a063aeee49f7d188d42e34dc2`, under the MIT License,
copyright © 2022 Open Spaced Repetition. The complete license is in
[`third_party/fsrs/LICENSE`](third_party/fsrs/LICENSE) and included in the APK at
`assets/licenses/fsrs.txt`.

The port uses the reference FSRS-6 default 21 weights, power forgetting curve,
initial/short-term/long-term stability, difficulty, learning and relearning
transitions. It fixes learning to 1 and 10 minutes, relearning to 10 minutes,
sets desired retention to 90% by default, caps intervals at 36,500 days, and
disables random interval fuzz. Times are UTC epoch milliseconds; day differences
use complete elapsed 24-hour periods. The maximum interval and mathematical
rounding match the reference. Ratings are stored for each fact, not each question.

The reference fixture in `lesson-model/src/test/resources/fsrs-reference.json`
contains 24 independent Python-generated steps, covering initial ratings,
short-term repetitions, review success, lapses and relearning. The Kotlin tests
compare phase, step, stability, difficulty and exact due time. The fixture's
`referenceCommit` records its source. See [verification](docs/VERIFICATION.md)
for what was actually run.

The official Kotlin sample at
[`kotlin-fsrs` commit `670f2f8`](https://github.com/open-spaced-repetition/kotlin-fsrs/tree/670f2f895f316a9f78dfd19b991d9bc523c9b037)
was inspected. Its application-specific imports and differences from the
canonical formulas prevented using it unchanged. This app instead contains a
small, independently tested Kotlin translation of the pinned Python reference.
No claim of interchangeability with Anki collections or `.apkg` is made.

## Android dependencies

Versions are pinned in the Gradle files. Kotlin 2.0.21 and AndroidX libraries,
including Compose, Room, DataStore and Media3, are distributed under their
respective upstream licenses (principally Apache License 2.0). The [Apache license](third_party/androidx/APACHE-2.0.txt) is also included in the APK assets. Android Media3
ExoPlayer is pinned at 1.5.1 for this compileSdk 35 / AGP 8.7.3 project.

Primary documentation:

- [Media3 ExoPlayer](https://developer.android.com/media/media3/exoplayer/hello-world)
- [Room](https://developer.android.com/training/data-storage/room)
- [DataStore](https://developer.android.com/topic/libraries/architecture/datastore)
- [Compose state and lifecycle](https://developer.android.com/develop/ui/compose/state)

## Narration and artwork

Breeze TTS 2 runs as an external CPU authoring tool. Neither its source checkout,
model, saved voice nor generated audio is bundled in this source repository or
Android app. Exact upstream revisions, model hash, commands and measurements are
in [BREEZE_CPU.md](docs/BREEZE_CPU.md) and `tools/breeze/versions.json`.
Consult the [upstream repository](https://github.com/HoppouAI/Breeze-TTS-2.cpp)
and [model repository](https://huggingface.co/HoppouAI/Breeze-TTS-2.cpp)
for their license terms when distributing model weights or generated material.

The library-tour illustration and scripts are original nonmedical demonstration
material. Sketchy and Picmonic supplied visual-teaching inspiration only; no
artwork, interface assets, source text or medical facts were copied from them.
