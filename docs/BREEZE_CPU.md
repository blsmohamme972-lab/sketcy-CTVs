# Breeze TTS 2 CPU feasibility record

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

## Test protocol

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

## Measured outcome and checkpoint decision

**Short-form CPU inference succeeded. The complete narration/camera milestone
is not accepted.** The process exited 0, reported `backend: CPU`, and produced a
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

### Bounded stopping point

This increment adds the pinned CPU probe, its neutral scripts, failure/measurement
tests, and measured evidence. A three-minute CPU process produced only 12.56
seconds of audio on this machine. Full dual-track generation, listening, timing
alignment, and Android integration are left for the next authorized increment;
no throughput claim is made for a 1–4-minute track or for a phone.

The [explanation](../tools/breeze/text/explanation.txt) and
[story](../tools/breeze/text/story.txt) scripts are ready for a later test but were
**not generated**. No finished lesson, synchronized proof, or medical content was
created. Media3 playback, image viewport rendering, captions/highlights in the UI,
and emulator/device checks remain unimplemented or unperformed.

There was no CPU crash, timeout, or out-of-memory failure in this take. The open
gate is audio acceptance and full-track validation, rather than a proven engine
failure. If a later CPU attempt fails, record its actual failure and pause the
audio milestone without changing model, quantization, or backend.

Next: listen to the smoke output against its exact text; resolve any quality
failure using the same approved CPU engine; then generate and measure both
neutral tracks, verify consistent synthetic voice, and align actual segments.
Only after those checks should real narration drive Media3 and `PlaybackTimeline`
on an emulator/device. A medical pilot still requires the user's supplied source.
