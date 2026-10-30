# Sketcy CTVS — Final Project Plan

> Checkpoint update (2026-10-30): the latest request authorizes only the first
> approximately 10% of implementation, saving it to GitHub, and then stopping.
> The repository now contains the initial app/model foundation described in
> [README.md](README.md). The documentation-only delivery/status statements below
> describe the earlier planning session and are superseded by this request.
> The remaining product requirements and staged approval boundaries are retained.

## 1. Goal and confirmed requirements

Build a personal Android study app inspired by Sketchy’s visual storytelling and Picmonic’s explanation/story modes.

- Use **only the PDFs or text you provide** as medical content sources.
- Preserve **every medical fact**, while rewriting clearly for narration.
- Divide longer material into parts. **Each part has two separate narration modes, each lasting 1–4 minutes.**
- Generate original illustrations with GPT image generation.
- Generate both narration tracks using **Breeze TTS 2 on CPU in the assistant’s environment**.
- Animate illustrations with synchronized camera movements instead of producing video files.
- Deliver lesson ZIPs that you import into the app.
- Include adaptive, mixed image-based review.
- Use English, work alone, and request permission after each implementation milestone.

The immediate GitHub deliverable is `PLAN.md`, linked from `README.md`, with no application implementation.

**Status:** planning is complete. GitHub has not been updated because this session remains in Plan mode.

## 2. Android experience and architecture

Use Kotlin, Jetpack Compose, Room, DataStore, and Android Media3. Support Android 8 and newer. Imported lessons and reviews work offline without accounts, subscriptions, or a server.

| Area | Behavior |
|---|---|
| Library | Import ZIPs, search, filter by specialty, bookmark, and resume lessons. |
| Lesson overview | Show parts, learning objectives, completion, and references to your supplied material. |
| Player | Switch explanation/story modes; pause, seek, change speed, display captions, and use landscape fullscreen. |
| Symbol Explorer | Tap characters for their meanings, browse the symbol list, and hide explanations for recall. |
| Review | Mix image recall, image occlusion, tapping the correct symbol, and source-based multiple-choice questions. |
| Progress and settings | Show due reviews, track learning, adjust playback, and export or restore personal data. |

Media3’s audio position controls camera movement and highlighting. Seeking and speed changes must preserve synchronization. Switching narration modes starts at the corresponding fact or symbol in the other track.

Use smooth pans, eased zooms, and focused highlights. Provide manual image exploration and a reduced-motion setting.

## 3. Source-to-lesson production and ZIP interface

**Production sequence**

1. Extract text, tables, and relevant figure labels from your material. Use OCR for scanned pages and flag uncertain readings.
2. Build a fact inventory with source page or passage references.
3. Preserve numbers, units, conditions, exceptions, and relationships when rewriting. Flag contradictions or unclear passages for clarification; do not resolve them using external medical sources.
4. Divide the inventory into coherent parts suitable for the two 1–4-minute narration tracks.
5. Map facts to memorable characters and objects. Reuse established symbols across lessons.
6. Write the medical explanation and a separate mnemonic story. Invent story events and settings without adding unsupported medical claims.
7. Generate and inspect the illustrations, then generate both narration tracks.
8. Measure actual audio durations and create captions, camera cues, hotspots, and review questions.
9. Check coverage against the source inventory before packaging.

Use a Python production toolkit for validation, audio assembly, timing, and ZIP creation. GPT image generation remains an assisted authoring step outside the Android app.

Test the CPU build of Breeze-TTS-2.cpp with its standard Q8_0 model first. Generate short segments using a consistent synthetic voice, then assemble each track. Assess pronunciation, completeness, consistency, memory use, and generation time.

**The CPU environment is currently unavailable.** If CPU generation fails its feasibility test, report the blocker and pause the audio milestone. Do not silently substitute another model, GPU service, or placeholder audio.

**Lesson package**

Each ZIP contains a versioned manifest, illustrations, both audio tracks for every part, captions, camera cues, symbol definitions, review questions, and source references.

The manifest connects stable lesson, part, fact, symbol, segment, and question identifiers. Image regions use normalized coordinates; cue timing uses milliseconds. Packages contain media and data, never executable code.

Import validates archive paths, size limits, checksums, asset references, and supported versions before saving. Failed imports leave existing lessons intact. Updating a lesson preserves scheduling for unchanged facts; changed facts return to learning.

Keep GitHub focused on code and documentation. Deliver your lesson packages separately.

## 4. Adaptive review and staged delivery

Use FSRS v6 through its Kotlin implementation, with a default retention target of 90%. Maintain scheduling per fact, with question variants connected to that fact.

- Begin new facts with an image cue.
- After successful recall, rotate eligible question types to test the same knowledge differently.
- After a mistake, reveal the correct symbol and source-based explanation, then schedule relearning.
- Objectively incorrect answers count as Again. After correct answers or self-assessed recall, offer Again, Hard, Good, and Easy.
- Record question type, rating, and review time. Keep review history separate from lesson packages.

Anki synchronization and `.apkg` compatibility are outside version one.

**Milestones requiring separate approval**

1. Screen designs, package specification, and original visual direction.
2. CPU narration and synchronized camera proof of concept.
3. Library, storage, ZIP import, and persistence.
4. Complete player, captions, narration switching, and Symbol Explorer.
5. Mixed review, FSRS scheduling, progress, and backup/restore.
6. Complete pilot lesson using your first supplied PDF or text.
7. Installable Android APK, reproducible GitHub builds, and installation instructions.

At each milestone, report completed work, verification results, and remaining limitations before requesting permission for the next.

## 5. Acceptance criteria

- Every supplied medical fact maps to a lesson segment; every generated medical claim maps back to your material.
- Every explanation track and story track lasts 1–4 minutes at normal speed.
- Both tracks contain actual, verified Breeze-generated narration.
- Camera movement, captions, and highlights remain synchronized through seeking, speed changes, and rotation.
- A valid ZIP imports and works after restarting the app in airplane mode.
- Invalid packages fail safely; lesson updates and backups preserve appropriate progress.
- Questions conceal answers until submission or reveal, and scheduling survives restarts.
- Emulator testing passes; a physical Android installation and playback check is recorded before device validation is considered complete.
- Final delivery includes source code, an installable APK, a validated pilot ZIP, generation instructions, and test results.

For the current documentation-only task, completion means committing `PLAN.md` and its README link, reading them back from GitHub, and then replying **“Done.”**
