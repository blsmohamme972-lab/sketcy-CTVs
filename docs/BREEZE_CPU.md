# Breeze TTS 2 CPU generation record

Date: 2026-10-30. This is a technical test with original, nonmedical English
text. No user medical source was supplied, and no medical lesson was authored.

## Reproducible inputs

| Item | Exact identity |
| --- | --- |
| C++ implementation | `HoppouAI/Breeze-TTS-2.cpp` |
| Source commit | `2904b9ad126c07363e8a6c9afa08f73e3309075b` |
| ggml submodule | `36da57138425487184aa1da2eee2cde155909c6f` |
| shine submodule | `ab5e3526b64af1a2eaa43aa6f441a7312e013519` (not linked into the CLI) |
| Model repository | `HoppouAI/Breeze-TTS-2.cpp` on Hugging Face |
| Model repository revision | `81b22bad9f05b99970e30c5ee5e4bbc52fedf2f8` |
| Model filename | `breeze-tts-2-q8_0.gguf` — standard Q8_0, no `-dd` variant |
| Model bytes | `3568844480` (3.57 decimal GB; 3.32 GiB) |
| Model SHA-256 | `a02bcc4b69b0601032727f8040c4942149b1b73aa0f69022fe5aaa6a8f0ef879` |
| Built CLI SHA-256 | `f2c83bded360a23df89fdf95a75551c3c5d4432e089c6205b06b4fb689c47122` |

The full downloaded file matched both the published byte count and SHA-256.
Downloading took 213.882519 seconds, measured by curl; download time is excluded
from inference timings. The source checkout and submodules remained unmodified.
This GGUF includes the codec; no separate vocoder download or conversion was used.

Primary references:

- [Pinned upstream build instructions](https://github.com/HoppouAI/Breeze-TTS-2.cpp/blob/2904b9ad126c07363e8a6c9afa08f73e3309075b/docs/build.md)
- [Pinned CLI and splitting behavior](https://github.com/HoppouAI/Breeze-TTS-2.cpp/blob/2904b9ad126c07363e8a6c9afa08f73e3309075b/docs/cli.md)
- [Pinned model and codec documentation](https://github.com/HoppouAI/Breeze-TTS-2.cpp/blob/2904b9ad126c07363e8a6c9afa08f73e3309075b/docs/models.md)
- [Model repository at the tested revision](https://huggingface.co/HoppouAI/Breeze-TTS-2.cpp/tree/81b22bad9f05b99970e30c5ee5e4bbc52fedf2f8)

## Environment and setup

| Item | Observed setup |
| --- | --- |
| OS | Linux `6.18.57`, x86-64, glibc 2.39 |
| CPU reported by VM | Intel Xeon Platinum 8573C |
| Available logical CPUs | 9; cgroup quota `800000 100000` = 8 CPU equivalents |
| Memory | Host-reported 10,206,468 KiB; cgroup limit 8,589,934,592 bytes (8 GiB); no swap |
| CPU instruction support | AVX2 and AVX-512 reported by the VM |
| CMake | 3.31.6, installed into a temporary directory from the pinned PyPI package |
| Compiler | GCC/G++ 13.3.0, Ubuntu `13.3.0-6ubuntu2~24.04` |
| Build | Release; Unix Makefiles; `GGML_NATIVE=ON`, OpenMP enabled; 4 build jobs |
| Backends | `BREEZE_VULKAN=OFF`, `BREEZE_CUDA=OFF`, `GGML_VULKAN=OFF`, `GGML_CUDA=OFF` |
| Inference | `--cpu`; upstream ggml default of 4 worker threads, also observed in `/proc` |
| Probe runtime | Python 3.12.14; standard library only |

The upstream CPU CLI and depth regression target built successfully. The build
log contained no compiler `warning:` or `error:` lines. The executable's linked
libraries include ggml CPU and OpenMP; no Vulkan/CUDA library was linked. Only the
CPU regression test was selected, and it passed. That test uses synthetic tensors
and does **not** establish full-model speech quality.

See [the tool instructions](../tools/breeze/README.md) for the complete clone,
checkout, build, model verification, and benchmark commands. The initial sandbox
could not reach its proxy; the approved execution path successfully performed
the downloads without changing proxy settings or disabling TLS verification.

## Historical short smoke protocol at `c5eea4d`

The first case is [smoke.txt](../tools/breeze/text/smoke.txt), a 29-word passage
describing a lantern, paper birds, a clock, and a wooden boat. It is deliberately
short to expose CPU inference failures before spending time on full tracks.
It is not a completed 1–4-minute lesson track.

The synthetic voice instruction is "A calm adult narrator speaking clear,
natural English at a steady pace." Settings: seed 42, CFG 1.0, automatic text
splitting at approximately 600 characters, a 750-frame cap per piece, and
`--timings`. Other sampling settings remain the pinned GGUF defaults. No human
reference recording, voice clone, alternate model, or GPU service is used.

The probe verifies the exact source, CPU build settings, and full model digest
before launching the CLI. It measures wall time, user/system CPU time, and
peak child RSS using Linux `wait4`. End-to-end wall time includes model loading
and process startup; hashing and downloads are excluded. Peak RSS excludes file
cache and the Python parent. WAV duration comes from actual PCM sample frames.
The process must exit successfully and report the CPU backend; an incomplete WAV
after a failure cannot pass. A valid WAV still requires listening review.

## Historical short smoke measurements

**Short-form CPU inference succeeded at the bounded checkpoint.** That
checkpoint did not accept the complete narration/camera milestone. The process exited 0, reported `backend: CPU`, and produced a
valid, nonsilent WAV before the 600-second timeout. This is one measured take,
not a repeatability, long-form, or cross-voice benchmark.

The machine-readable [run report](benchmarks/breeze-cpu-smoke-2026-10-30.json)
preserves the actual arguments, input, source/model identities, and measurements.
Only this text report is committed; the audio and model remain outside Git.

| Measurement | Result |
| --- | --- |
| Probe started (UTC) | 2026-10-30 19:28:17; source/model verification precedes the timed child |
| End-to-end process wall time | 174.906905 seconds, including model loading |
| CPU user time | 648.328184 seconds |
| CPU system time | 5.807088 seconds |
| Peak child RSS | 4,327,580 KiB = 4.13 GiB |
| Time to first audio, reported by upstream | 5,019 ms; measured within generation, not process startup |
| Measured WAV duration | 12.560000 seconds; 301,440 PCM sample frames |
| Generated codec frames | 157; below the 750-frame cap |
| Output format | Mono, 24,000 Hz, signed little-endian PCM16 |
| WAV size | 602,924 bytes |
| WAV SHA-256 | `6dd3282fa17e6322b39a38cef526d633aca0935d50b5df4ccf78f7369e168f4d` |
| Wall time / audio duration | 13.925709 seconds per audio second |
| Peak level | -7.642692 dBFS |
| RMS level over the complete file | -22.278353 dBFS |
| Full-scale sample fraction | 0.0 |
| Duration appropriate for a completed lesson track? | No; this deliberately short smoke test is below 60 seconds |

`ffprobe` independently confirmed PCM16, one channel, 24 kHz, 12.560000 seconds,
and 602,924 bytes. The WAV reader also verified that its declared sample count
matched the readable PCM payload and that the payload was not all digital silence.

Upstream `--timings` reported:

| Stage | Time |
| --- | --- |
| Reference encode | 0.0 ms (no reference recording) |
| Prompt build | 798.4 ms |
| Backbone prefill | 1,558.5 ms |
| First vocoder flush | 876.6 ms; included in total vocoder time |
| Backbone decode | 18,068.6 ms |
| Depth decode | 64,126.1 ms |
| Vocoder total | 86,264.0 ms |

These stage measurements are not interchangeable with the end-to-end wall time.
The vocoder and depth decoder account for most of the reported inference work.
No CPU performance tuning or upstream source patch was applied.

### Audio-quality findings and their limits

The automatic checks establish a complete WAV container, nonzero signal, and
headroom below full-scale output. They do not establish that every requested word
was spoken, or rule out distortion below full scale, noise, mispronunciation,
garbled speech, or an unnatural voice. The run ended below its frame cap, but that
alone does not prove a complete spoken ending.

**Listening review was not performed.** This session could not ingest audio for
listening, and no supported transcription capability was available. Pronunciation,
sentence completeness, pacing, subjective clarity, and voice consistency remain
unverified. The original test WAV is supplied separately for listening; it has
not been approved as production narration. No ASR result or human listening
assessment is claimed.

## Current full-track generation and integration

The version 0.2.0 checkpoint extends the historical smoke probe with separately
synthesized explanation/story segments using the same pinned standard Q8_0 CPU
binary. A cached synthetic voice is encoded from the original smoke WAV and
shared by all segments. The anchor is our own synthetic audio; its intended
transcript has not been verified by listening. Shared conditioning records the
voice input but does not prove perceptual consistency.

Each paragraph is generated in a separate process with `--cpu`, seed 42, CFG 1.0,
`--split-chars 0`, a 750-frame cap and `--timings`. Any nonzero exit, timeout,
missing CPU evidence, empty/silent WAV, hash mismatch or frame-cap termination
stops production. The runner concatenates actual PCM payloads without padding,
time stretching, alternate synthesis or replacement audio. Each assembled track
must independently measure 60–240 seconds at normal speed.

The original nonmedical scripts are
[explanation.txt](../tools/breeze/text/explanation.txt) and
[story.txt](../tools/breeze/text/story.txt). The production plan assigns source
fact/symbol IDs to each paragraph. Captions and camera/highlight segments use the
measured paragraph boundaries, not estimated word timing. The original artwork,
actual audio and versioned manifest are distributed in a separate technical-demo
ZIP; none of those media files is committed.

Media3 now plays imported WAV files and drives `PlaybackTimeline` from actual
content position. See [verification](VERIFICATION.md) for build and runtime
results, and [the production guide](../tools/production/README.md) for commands.
The complete [full-run record](benchmarks/breeze-cpu-tracks-2026-10-30.json)
preserves every segment command, exact input text, measurements, voice hash and
independent ffprobe result. Both tracks pass the 60–240-second duration gate.

These are resource-contended authoring measurements: Android compilation and a
software emulator overlapped portions of generation. They are not isolated
throughput, repeated-run, desktop-to-phone or phone inference benchmarks.
The model is not executed on Android.

Human listening remains unperformed for the smoke, voice anchor and both full
tracks. No ASR score or transcript match is claimed. Review completeness,
pronunciation, clarity, joins, pacing, consistency and endings before approving
narration. A CPU failure or quality failure pauses the audio milestone without a
model, quantization, GPU service or placeholder-audio substitution. A medical
pilot still requires the learner's supplied PDF/text and complete source review.

## Full explanation/story measurements

All eight CPU processes exited 0 and produced valid nonzero mono 24 kHz PCM16.
No timeout, frame-cap termination or recorded OOM kill occurred. PCM assembly
added no silence and changed no sample rate or speed. `ffprobe` independently
agrees with each assembled file's format, sample count duration and byte size.

| Track | Actual duration | PCM frames | Sum of four process wall times | Largest process RSS | Wall / audio |
| --- | ---: | ---: | ---: | ---: | ---: |
| Explanation | 86.88 s | 2,085,120 | 1841.456650 s | 4,431,176 KiB (4.23 GiB) | 21.195403 |
| Story | 91.04 s | 2,184,960 | 1616.791272 s | 4,416,816 KiB (4.21 GiB) | 17.759131 |

Each CLI process reloads the model. These sums include process startup/loading,
and exclude model verification, downloads, artwork, assembly, package validation
and Android checks. The eight narration processes total **3458.247922 seconds**
(57.64 minutes) for **177.92 seconds** of assembled audio.

The one shared voice-encoding process took **9.758588 seconds**,
with peak RSS **3,907,168 KiB**. It is excluded from the track sums above.
Cached voice SHA-256: `7f9fba8918bfc79c37702c2d391ee98395d1435db56fc4cc94a54fcfae26eeb6`.

| Segment | Actual audio | Process wall time | User CPU | System CPU | Peak RSS (KiB) |
| --- | ---: | ---: | ---: | ---: | ---: |
| explanation-1 | 22.80 s | 427.457470 s | 1560.787033 s | 10.181263 s | 4,405,716 |
| explanation-2 | 17.36 s | 310.733304 s | 1140.433491 s | 6.950342 s | 4,388,272 |
| explanation-3 | 16.08 s | 343.180822 s | 1207.285553 s | 13.759055 s | 4,382,280 |
| explanation-4 | 30.64 s | 760.085054 s | 2558.041317 s | 17.161358 s | 4,431,176 |
| story-1 | 26.64 s | 516.107733 s | 1867.706820 s | 11.345796 s | 4,416,816 |
| story-2 | 24.08 s | 410.341108 s | 1509.679975 s | 10.248194 s | 4,410,120 |
| story-3 | 19.52 s | 390.025247 s | 1378.167273 s | 11.645052 s | 4,394,704 |
| story-4 | 20.80 s | 300.317185 s | 1115.113592 s | 11.614327 s | 4,399,068 |

CPU user/system time aggregates worker threads and can exceed wall time. Peak
RSS is the largest measured child resident set, not the sum of processes or the
whole machine's peak memory. During overlap with the first emulator attempt,
cache/memory contention occurred; the emulator was stopped to let synthesis
finish, then restarted for Android tests. These timings must retain that caveat.

| Track | Bytes | Peak | RMS | Full-scale sample fraction |
| --- | ---: | ---: | ---: | ---: |
| Explanation | 4,170,284 | -8.696469 dBFS | -23.805100 dBFS | 0.0 |
| Story | 4,369,964 | -6.890277 dBFS | -23.803668 dBFS | 0.0 |

Assembled WAV SHA-256 identities:

- Explanation: `157f0bce7dfac5b66071348d7d9e632a0d778f464eba4142025a57967ed9a87a`.
- Story: `03cbc608a799fbed50adbe952dd0bf191d0e9b1960d3a4396c837ce2b8ca406e`.

These signal findings show headroom and nonzero output; they do not establish
a listening pass. The unreviewed technical package is suitable for engineering
playback checks. Neither this record nor the APK certifies medical narration.
