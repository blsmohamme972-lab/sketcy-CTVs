# Third checkpoint verification

Date: 2026-10-30. Scope: a bounded CPU feasibility increment after
`d58a734b6c715aab5c36fcdd7cc8406492d36840`. The app and Kotlin timing core were
not changed. A short successful CPU run does not establish completed narration,
Media3 synchronization, or an overall 30% implementation milestone.

## Checks performed in this increment

| Check | Result and scope |
| --- | --- |
| Existing lesson-model JVM unit tests | **21 passed**, 0 failures/errors/skipped; rerun with OpenJDK 17.0.20 and Gradle 8.9 |
| Python benchmark-tool unit tests | **12 passed** with Python 3.12.14 |
| Upstream C++ CPU CLI and test target | Release build passed with GCC 13.3.0 and CMake 3.31.6; Vulkan/CUDA disabled |
| Upstream `depth-replay-cpu` CTest | **1 passed**; synthetic tensors, not a full-model speech test |
| Standard Q8_0 model identity | Actual 3,568,844,480-byte file matched published SHA-256 and pinned model revision |
| Actual Breeze CPU smoke inference | **Process exited 0**, CPU backend; 174.906905 seconds wall time, 4.13 GiB peak child RSS |
| Actual generated WAV | 12.56 seconds, 301,440 frames, mono 24 kHz PCM16; no empty/truncated/all-zero payload |
| Independent ffprobe check | Format, channels, sample rate, duration, and size agree with the Python measurement |
| Automatic signal measurements | Peak -7.64 dBFS, RMS -22.28 dBFS, full-scale sample fraction 0.0; not a listening pass |
| Documentation and evidence consistency | Local Markdown links, JSON parsing, pinned-input/report agreement, and `git diff --check` passed |
| Repository artifact check | Tracked/candidate files contain no model weights, generated media, PDFs, credentials, or unexpected large files |

Commands run from the repository:

```sh
./gradlew :lesson-model:test --no-daemon
python3 -m unittest discover -s tools/breeze -p 'test_*.py' -v
python3 tools/breeze/benchmark.py --source-dir /tmp/sketcy-breeze-cpu-src --model /tmp/sketcy-breeze-model/breeze-tts-2-q8_0.gguf --case smoke --timeout-seconds 600 --output-dir /tmp/sketcy-breeze-smoke-01
ffprobe -v error -show_entries format=duration,size -show_entries stream=codec_name,sample_rate,channels,bits_per_sample -of json /tmp/sketcy-breeze-smoke-01/narration.wav
```

Full native setup and the CPU CTest command are in
[tools/breeze/README.md](../tools/breeze/README.md). Exact versions, hardware,
metrics, and limits are in [BREEZE_CPU.md](BREEZE_CPU.md) and the
[machine-readable report](benchmarks/breeze-cpu-smoke-2026-10-30.json).
Model weights and the generated WAV are excluded from GitHub.

The Python tests use tiny temporary PCM parser fixtures and short child processes
to test duration measurement, clipping counts, silence/empty/truncation/rate
rejection, wrong or partial model rejection, GPU-build rejection, timeout
termination, nonzero exit handling, and explicit listening-review status. These
fixtures are not narration, are not shipped, and were not used in the app.

## Not validated in this increment

- **No listening or ASR review.** This session could not ingest audio for listening
  and had no supported transcription capability. Pronunciation, omissions,
  substitutions, noise, clarity, pacing, and voice consistency remain unknown.
- The neutral explanation/story scripts were not synthesized. No 60–240-second
  track pair, long-form stability, repeated-run statistics, or source-to-audio
  coverage is claimed. The smoke clip is intentionally shorter than a lesson.
- No Android compilation or lint rerun: there was no configured SDK/adb, and no
  Android/Kotlin source or dependency change required a new Android build.
- **No emulator or physical-device tests.** Media3 playback, camera/caption/
  highlight rendering, pause/seek/speed behavior, narration switching, reduced
  motion, rotation, TalkBack, and process recreation remain device-unverified.
- No medical source, fact inventory, finished lesson, lesson ZIP, imported assets,
  adaptive review, or installable APK was created.

The full CPU narration/synchronized-camera milestone remains partial. The next
worker must pass listening and full-track checks before integrating the real
audio. If a later CPU attempt fails, preserve its measured failure and pause
without substituting a model, GPU service, or placeholder audio.

## Historical Android verification at the second checkpoint

At `d58a734`, on the same calendar date, the previous worker recorded Linux,
OpenJDK 21, Gradle 8.9, Android SDK platform 35, and Build Tools 34.0.0:

```sh
./gradlew :lesson-model:test :app:compileDebugKotlin :app:lintDebug --no-daemon
```

That checkpoint passed 21 JVM tests and Android Kotlin compilation. Lint reported
0 errors and 3 warnings: two newer AndroidX dependency versions and the future
need for Android 12+ data-extraction rules. Android XML parsing, documentation
links, the wrapper JAR checksum, and the pinned Gradle distribution were also
verified then. These historical build/lint results must not be described as
new emulator/device validation or a fresh Android build in this increment.
