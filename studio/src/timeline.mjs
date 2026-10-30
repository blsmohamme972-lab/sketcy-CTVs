import {
  clamp,
  bounds,
  multiply,
  translate,
  around,
  rotate,
  scale,
} from "./geometry.mjs";
export const FULL_SCENE = Object.freeze({ x: 0, y: 0, width: 1, height: 1 });
export const smooth = (t) => t * t * (3 - 2 * t);
const lerp = (a, b, t) => a + (b - a) * t;
export function frameAt(track, positionMs, reducedMotion = false) {
  const time = clamp(Math.floor(positionMs), 0, track.durationMs),
    cue = track.cues.find((c) => time >= c.startMs && time < c.endMs) || null;
  let camera = { ...FULL_SCENE };
  if (!reducedMotion)
    for (const c of track.cues) {
      if (!c.camera) continue;
      if (time < c.startMs) break;
      const t = clamp((time - c.startMs) / (c.endMs - c.startMs), 0, 1),
        e = c.easing === "LINEAR" ? t : smooth(t);
      camera = Object.fromEntries(
        Object.keys(camera).map((k) => [k, lerp(camera[k], c.camera[k], e)]),
      );
      if (time < c.endMs) break;
    }
  return {
    positionMs: time,
    cueId: cue?.id ?? null,
    caption: cue?.text ?? "",
    factIds: cue?.factIds ?? [],
    layerIds: cue?.layerIds ?? [],
    camera,
  };
}
export function switchPosition(from, to, positionMs) {
  const time = clamp(Math.floor(positionMs), 0, from.durationMs);
  const cue = from.cues.find((c) => time < c.endMs) || from.cues.at(-1);
  if (!cue || !cue.factIds.length) return 0;
  const target = to.cues.find((c) => c.factIds.includes(cue.factIds[0]));
  if (!target) return 0;
  const ratio = clamp((time - cue.startMs) / (cue.endMs - cue.startMs), 0, 1);
  return Math.floor(target.startMs + ratio * (target.endMs - target.startMs));
}
export function motionAt(keys, time, reducedMotion = false) {
  const base = { dx: 0, dy: 0, scale: 1, rotation: 0 };
  if (reducedMotion || !keys.length) return base;
  // An omitted zero keyframe means the object starts at its base transform.
  const all = keys[0].atMs === 0 ? keys : [{ atMs: 0, ...base }, ...keys];
  if (time <= all[0].atMs) return { ...all[0] };
  for (let i = 1; i < all.length; i++)
    if (time < all[i].atMs) {
      const a = all[i - 1],
        b = all[i],
        t = smooth((time - a.atMs) / (b.atMs - a.atMs));
      return Object.fromEntries(
        Object.keys(base).map((k) => [k, lerp(a[k], b[k], t)]),
      );
    }
  return { ...all.at(-1) };
}
export function animatedMatrix(node, mode, time, reducedMotion = false) {
  const m = motionAt(node.motion[mode], time, reducedMotion),
    b = bounds(node);
  return multiply(
    translate(m.dx, m.dy),
    multiply(
      around(
        b.x + b.width / 2,
        b.y + b.height / 2,
        multiply(rotate(m.rotation), scale(m.scale)),
      ),
      node.matrix,
    ),
  );
}
export function putKeyframe(node, mode, key) {
  node.motion[mode] = node.motion[mode]
    .filter((k) => k.atMs !== key.atMs)
    .concat(key)
    .sort((a, b) => a.atMs - b.atMs);
}
