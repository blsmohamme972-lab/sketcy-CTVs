# Initial checkpoint verification

Scope: approximately the first 10% foundation only. This percentage describes
the intended work boundary; the full project's final code size is unknown.

Verified locally on 2026-10-30 using Linux, OpenJDK 21, Gradle 8.9, Android SDK
platform 35, and Build Tools 34.0.0:

```sh
./gradlew :lesson-model:test :app:compileDebugKotlin :app:lintDebug --no-daemon
```

| Check | Result |
| --- | --- |
| Lesson-model unit tests | 5 passed; 0 failures, errors, or skipped tests |
| Android Kotlin compilation | Passed |
| Android lint | Passed: 0 errors, 3 warnings |
| Android XML parsing and README documentation links | Passed |
| Gradle wrapper JAR | SHA-256 matches Gradle's published 8.9 wrapper checksum |
| Gradle distribution | SHA-256 pinned in wrapper properties and verified during download |

Lint warnings identify two newer AndroidX dependency releases and the future need
for Android 12+ data-extraction rules. The initial dependency set is pinned and
compiled successfully. Persistent personal data and backup configuration belong
to later increments; this shell currently stores no lesson or review records.

The app has not been tested on an emulator or physical Android device. UI
appearance, TalkBack, rotation, and process recreation are not yet device-verified.
No complete lesson, narration, ZIP import, playback, scheduling, or APK delivery
is claimed. Later milestones remain unimplemented and work stops here.
