# Installation and device acceptance

## APK and offline lesson import

The delivered APK passed compilation, signing verification, unit tests and a
fresh CI build. App runtime validation is still open: the local software-only
Android 8 emulator timed out during APK installation, before instrumented tests
could execute. The checklist below is required for actual device acceptance.

Version 0.2.0 is a debug-signed personal-testing APK for Android 8+ (minSdk 26,
targetSdk 35). Download the [public APK](https://github.com/blsmohamme972-lab/sketcy-CTVs/releases/download/v0.2.0-android-preview/Sketcy-CTVS-0.2.0.apk)
in Chrome or another browser. Its exact size is 13,408,761 bytes. The separate
Lantern Library lesson ZIP remains in the delivery message. Install the APK from
a file manager, allow installation for that chosen app when Android asks, and
open Sketcy CTVS.

If Android reports a package parsing problem, check the downloaded file's exact
size and compare its SHA-256 with the release's `SHA256SUMS.txt` when possible.
A successful download and signature check do not diagnose a phone's installation
failure. Record the Android version and installer error; do not claim the new
URL by itself fixes that error.

The application includes no medical content, model weights or generated narration.
Use **Library → Import** to select the ZIP through Android's document picker.
The imported PNG and WAV files are copied into private app storage. They remain
available after the source ZIP is moved and with airplane mode enabled.

A complete JDK/SDK build produces the same app from source:

```sh
./gradlew :app:assembleDebug --no-daemon
adb install -r app/build/outputs/apk/debug/app-debug.apk
adb shell am start -n com.sketcy.ctvs/.MainActivity
```

A locally generated debug certificate may differ from the delivered/CI build.
For a signature conflict, first export a backup from the installed app, uninstall,
install the new build, and restore the backup. Uninstalling without a backup loses
private app data. Release signing and Play Store publication are not configured;
use a persistent owner-controlled signing key for long-term distribution.

## Behavior to expect

- New installations start empty. Importing a technical demo shows an explicit
  nonmedical label and its outstanding listening-review notice.
- Explanation and Story are separate audio files. Mode changes follow the
  shared fact in the active segment. Repeated facts map to the first destination
  occurrence; this is documented segment-level alignment, not word matching.
- Media3 playback pauses on backgrounding and headphone disconnection. Rotation
  retains the ViewModel/player. There is no background audio service.
- Positions save about once per second while playing, and on seek, switch and
  pause. An abrupt process kill can lose the most recent unsaved second.
- Reduced motion keeps the whole image still while captions/highlights progress.
  Pinch/drag enters manual exploration; “Follow scene” returns to the audio camera.
- Initial learning/relearning uses image recall. Graduated facts rotate through
  the available question types. Due times are stored in UTC epoch milliseconds;
  changing the retention target changes future ratings only.
- Backups include lessons, quotations, audio, bookmarks, progress, history and
  settings. Restore replaces local data only after validation. If a settings
  write is interrupted after the Room transaction, startup retries the journal.

## Physical-device checks still required

Record the device model, Android version, APK SHA-256 and lesson ZIP SHA-256.
Do not mark these complete based on a desktop build or software emulator:

1. Import the actual demo through the Android picker; restart the app in airplane
   mode and confirm artwork/audio/source passages load locally.
2. Listen to **every sentence in both tracks** against the intended scripts.
   Record omissions, substitutions, pronunciation, clipping/noise, pacing, joins,
   voice consistency and the ending. Subjective listening has not been claimed
   by this session's automated WAV checks.
3. Test play/pause, ±10-second jumps, arbitrary seeks, end-of-track replay and
   every speed. Confirm captions/highlights/camera follow the same audio position.
4. Switch modes at several facts. Rotate during playback; try landscape
   fullscreen and system Back. Background/foreground the app and resume.
5. Disconnect wired/Bluetooth headphones and test an audio-focus interruption.
   Confirm no unexpected audible playback and correct resume controls.
6. Try pinch/drag, Follow scene, captions off and reduced motion; test large font,
   dark mode and TalkBack. Tap reviews also offer named object buttons.
7. Reveal and rate image recall, try wrong/right taps and choices, and verify
   incorrect objective answers only offer Again. Restart and check persisted due
   times/history. Full long-term FSRS behavior is additionally reference-tested.
8. Export a backup, reinstall only after saving that backup somewhere independent
   of app storage, and restore. Check settings, bookmarks, progress and cards.

No medical pilot can be accepted until the learner supplies the original source
and a reviewer compares the complete fact inventory, both scripts, questions and
illustration against it. Keep the original PDF/text private and outside Git.
