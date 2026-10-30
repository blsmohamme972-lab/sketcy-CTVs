# Second checkpoint verification

Scope: approximately 20% — app/model foundation and playback timing core. This percentage describes
the intended work boundary; the full project's final code size is unknown.

Verified locally on 2026-10-30 using Linux, OpenJDK 21, Gradle 8.9, Android SDK
platform 35, and Build Tools 34.0.0:

```sh
./gradlew :lesson-model:test :app:compileDebugKotlin :app:lintDebug --no-daemon
```

| Check | Result |
| --- | --- |
| Lesson-model unit tests | 21 passed; 0 failures, errors, or skipped tests |
| Android Kotlin compilation | Passed |
| Android lint | Passed: 0 errors, 3 warnings |
| Android XML parsing and local documentation links | Passed |
| Gradle wrapper JAR | SHA-256 matches Gradle's published 8.9 wrapper checksum |
| Gradle distribution | SHA-256 pinned in wrapper properties and verified during download |

The first checkpoint passed 5 model tests. This increment adds 16 tests covering
caption/highlight boundaries and gaps, invalid timing, camera interpolation and
easing, focus bounds, reduced motion, repeated/backward seeking, mutable authoring
inputs, fact-aligned mode switching, reordered/repeated facts, and missing fact,
symbol, or audio references. The app still compiles against the expanded model.

Lint warnings identify two newer AndroidX dependency releases and the future need
for Android 12+ data-extraction rules. The initial dependency set is pinned and
compiled successfully. Persistent personal data and backup configuration belong
to later increments; this shell currently stores no lesson or review records.

The app has not been tested on an emulator or physical Android device. UI
appearance, TalkBack, rotation, and process recreation are not yet device-verified.
No complete lesson, narration, ZIP import, actual audio playback, scheduling, or
APK delivery is claimed. The pure timing-core checks do not establish Breeze
feasibility or Media3 synchronization. The narration/camera milestone remains
partial; see [the worker handoff](../HANDOFF.md) for the next bounded increment.
