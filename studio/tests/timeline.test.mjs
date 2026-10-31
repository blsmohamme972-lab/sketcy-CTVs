import test from "node:test";
import assert from "node:assert/strict";
import {
  frameAt,
  switchPosition,
  motionAt,
  animatedMatrix,
  putKeyframe,
} from "../src/timeline.mjs";
import { makeNode } from "../src/model.mjs";
import {
  inspectWav,
  retimeTrack,
  dataFromBytes,
  bytesFromData,
} from "../src/assets.mjs";
import { demoProject } from "../src/demo.mjs";
const cue = (id, start, end, fact, camera = null) => ({
  id,
  startMs: start,
  endMs: end,
  factIds: [fact],
  layerIds: [id],
  text: id,
  camera,
  easing: "LINEAR",
});
const track = {
  durationMs: 10000,
  cues: [
    cue("a", 0, 4000, "f1", { x: 0.2, y: 0.1, width: 0.5, height: 0.6 }),
    cue("b", 5000, 10000, "f2", { x: 0, y: 0, width: 1, height: 1 }),
  ],
};
test("cue intervals are half open; gaps and final boundary clear captions", () => {
  assert.equal(frameAt(track, 3999).caption, "a");
  assert.equal(frameAt(track, 4000).caption, "");
  assert.equal(frameAt(track, 5000).caption, "b");
  assert.equal(frameAt(track, 10000).caption, "");
});
test("camera interpolates from the previous settled focus and holds in a gap", () => {
  assert.equal(frameAt(track, 2000).camera.x, 0.1);
  assert.equal(frameAt(track, 4500).camera.x, 0.2);
  assert.equal(frameAt(track, 7500).camera.x, 0.1);
});
test("measured narration can keep a caption after its short camera transition settles", () => {
  const t = structuredClone(track);
  t.cues[0].cameraDurationMs = 1400;
  assert.equal(frameAt(t, 700).camera.x, 0.1);
  assert.equal(frameAt(t, 2000).camera.x, 0.2);
  assert.equal(frameAt(t, 2000).caption, "a");
  assert.equal(frameAt(t, 700).camera.x, 0.1);
});
test("backward seeks are deterministic and clamp at track boundaries", () => {
  const before = frameAt(track, 2000);
  frameAt(track, 9000);
  assert.deepEqual(frameAt(track, 2000), before);
  assert.equal(frameAt(track, -40).positionMs, 0);
  assert.equal(frameAt(track, 20000).positionMs, 10000);
});
test("reduced motion holds the whole scene but retains captions and highlights", () => {
  const f = frameAt(track, 6000, true);
  assert.deepEqual(f.camera, { x: 0, y: 0, width: 1, height: 1 });
  assert.equal(f.caption, "b");
  assert.deepEqual(f.layerIds, ["b"]);
});
test("shared-fact switch preserves progress and selects first matching target", () => {
  const to = {
    durationMs: 20000,
    cues: [
      cue("x", 0, 10000, "f2"),
      cue("y", 10000, 15000, "f1"),
      cue("z", 15000, 20000, "f1"),
    ],
  };
  assert.equal(switchPosition(track, to, 2000), 12500);
  assert.equal(switchPosition(track, to, 4500), 0);
  assert.equal(switchPosition(track, to, 10000), 10000);
});
test("unmatched or empty source facts return zero without fabrication", () => {
  assert.equal(switchPosition({ durationMs: 10000, cues: [] }, track, 2000), 0);
  assert.equal(
    switchPosition(
      { durationMs: 10000, cues: [cue("x", 0, 10000, "missing")] },
      track,
      2000,
    ),
    0,
  );
});
test("keyframes interpolate independently of frame sampling frequency", () => {
  const keys = [
    { atMs: 1000, dx: 10, dy: 0, scale: 1.02, rotation: 10 },
    { atMs: 2000, dx: 0, dy: 5, scale: 1, rotation: 0 },
  ];
  assert.equal(motionAt(keys, 500).dx, 5);
  assert.equal(motionAt(keys, 1500).dx, 5);
  const expected = motionAt(keys, 500);
  for (let t = 0; t < 2000; t += 37) motionAt(keys, t);
  assert.deepEqual(motionAt(keys, 500), expected);
  assert.deepEqual(motionAt(keys, 1500, true), {
    dx: 0,
    dy: 0,
    scale: 1,
    rotation: 0,
  });
});
test("reduced object motion returns its exact base transform", () => {
  const n = makeNode("rect", { matrix: [1, 0, 0, 1, 100, 200] });
  n.motion.story = [{ atMs: 0, dx: 20, dy: 30, scale: 2, rotation: 20 }];
  assert.deepEqual(animatedMatrix(n, "story", 500, true), n.matrix);
});
test("a keyframe at the same time replaces, rather than duplicates, the old key", () => {
  const n = makeNode("rect");
  putKeyframe(n, "story", { atMs: 1000, dx: 5 });
  putKeyframe(n, "story", { atMs: 0, dx: 0 });
  putKeyframe(n, "story", { atMs: 1000, dx: 8 });
  assert.equal(n.motion.story.length, 2);
  assert.equal(n.motion.story[1].dx, 8);
});
function wav({
  seconds = 2,
  rate = 24000,
  channels = 1,
  bits = 16,
  silent = false,
} = {}) {
  const dataBytes = seconds * rate * channels * (bits / 8),
    a = new Uint8Array(44 + dataBytes),
    d = new DataView(a.buffer);
  const str = (off, s) =>
    [...s].forEach((c, i) => d.setUint8(off + i, c.charCodeAt(0)));
  str(0, "RIFF");
  d.setUint32(4, a.length - 8, true);
  str(8, "WAVE");
  str(12, "fmt ");
  d.setUint32(16, 16, true);
  d.setUint16(20, 1, true);
  d.setUint16(22, channels, true);
  d.setUint32(24, rate, true);
  d.setUint32(28, (rate * channels * bits) / 8, true);
  d.setUint16(32, (channels * bits) / 8, true);
  d.setUint16(34, bits, true);
  str(36, "data");
  d.setUint32(40, dataBytes, true);
  if (!silent) d.setInt16(44, 1000, true);
  return a;
}
test("WAV duration comes from PCM frames, not a declared UI duration", () => {
  const info = inspectWav(wav());
  assert.equal(info.durationMs, 2000);
  assert.equal(info.sampleRate, 24000);
  assert.equal(info.bits, 16);
});
test("silent, truncated and incompatible WAVs are rejected", () => {
  assert.throws(() => inspectWav(wav({ silent: true })), /silence/);
  assert.throws(() => inspectWav(wav().slice(0, -2)), /length/);
  assert.throws(() => inspectWav(wav({ rate: 48000 })), /24,000/);
});
test("data URL round-trip retains all bytes", () => {
  const a = wav();
  assert.deepEqual(bytesFromData(dataFromBytes(a, "audio/wav")), a);
});
test("attaching a shorter WAV rescales cues and keyframes as draft timing", () => {
  const p = demoProject();
  retimeTrack(p, "story", 60000);
  assert.equal(p.tracks.story.durationMs, 60000);
  assert.equal(p.tracks.story.cues.at(-1).endMs, 60000);
  assert.equal(p.tracks.story.timingStatus, "manual_draft");
  const n = p.nodes.find((n) => n.name.startsWith("Lantern"));
  assert.equal(n.motion.story.at(-1).atMs, 60000);
});
