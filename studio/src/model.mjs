import {
  IDENTITY,
  translate,
  multiply,
  bounds,
  selectionBounds,
} from "./geometry.mjs";

export const SCHEMA = "sketcy.studio.v1";
export const MODES = ["explanation", "story"];
export const LIMITS = Object.freeze({
  nodes: 500,
  depth: 12,
  assets: 100,
  assetBytes: 32 * 1024 * 1024,
  projectBytes: 128 * 1024 * 1024,
  history: 60,
});
export const uid = (prefix) => `${prefix}-${globalThis.crypto.randomUUID()}`;
export const clone = (value) => structuredClone(value);
// Media strings are immutable and shared across history entries, not duplicated
// on every drag. Geometry, sources, tracks and facts are independent snapshots.
export function snapshot(p) {
  return { ...clone({ ...p, assets: {} }), assets: { ...p.assets } };
}
export function emptyProject(title = "Untitled scene") {
  const track = () => ({ durationMs: 90000, audioAssetId: null, cues: [] });
  return {
    schema: SCHEMA,
    id: uid("project"),
    title,
    width: 1600,
    height: 900,
    contentType: "TECHNICAL_DEMO",
    background: "#f5ecd9",
    nodes: [],
    assets: {},
    sources: [],
    facts: [],
    tracks: { explanation: track(), story: track() },
    quality: {
      sourceCoverageReviewed: false,
      audioReviewed: false,
      reviewer: "",
      notes: "",
    },
  };
}
export function makeNode(type, props = {}) {
  const n = {
    id: uid("layer"),
    type,
    name: type[0].toUpperCase() + type.slice(1),
    matrix: [...IDENTITY],
    width: 180,
    height: 140,
    fill: "#e7b45d",
    stroke: "#233832",
    strokeWidth: 3,
    opacity: 1,
    visible: true,
    locked: false,
    role: "element",
    factIds: [],
    motion: { explanation: [], story: [] },
    ...props,
  };
  if (type === "path") {
    n.points = props.points || [];
    n.closed = props.closed ?? false;
  }
  if (type === "text") {
    n.text = props.text ?? "A memorable idea";
    n.fontSize = props.fontSize ?? 48;
    n.fontFamily = props.fontFamily ?? "sans-serif";
    n.stroke = "none";
    n.fontWeight = props.fontWeight ?? "400";
  }
  if (type === "group") n.children = props.children || [];
  if (type === "rect") n.radius = props.radius ?? 0;
  return n;
}
export function flatten(nodes) {
  return nodes.flatMap((n) => [
    n,
    ...(n.type === "group" ? flatten(n.children) : []),
  ]);
}
export function findNode(p, id) {
  return flatten(p.nodes).find((n) => n.id === id);
}
export function scopeNodes(p, scope = []) {
  let nodes = p.nodes;
  for (const id of scope) {
    const n = nodes.find((v) => v.id === id);
    if (!n || n.type !== "group") return null;
    nodes = n.children;
  }
  return nodes;
}
export function scopeMatrix(p, scope = []) {
  let nodes = p.nodes,
    m = [...IDENTITY];
  for (const id of scope) {
    const n = nodes.find((v) => v.id === id);
    if (!n) break;
    m = multiply(m, n.matrix);
    nodes = n.children || [];
  }
  return m;
}
export class History {
  constructor() {
    this.past = [];
    this.future = [];
  }
  record(before, label) {
    this.past.push({ project: before, label });
    if (this.past.length > LIMITS.history) this.past.shift();
    this.future = [];
  }
  undo(current) {
    const entry = this.past.pop();
    if (!entry) return null;
    this.future.push({ project: snapshot(current), label: entry.label });
    return entry;
  }
  redo(current) {
    const entry = this.future.pop();
    if (!entry) return null;
    this.past.push({ project: snapshot(current), label: entry.label });
    return entry;
  }
  clear() {
    this.past = [];
    this.future = [];
  }
}
export function groupNodes(nodes, ids) {
  const chosen = nodes.filter((n) => ids.includes(n.id) && !n.locked);
  if (chosen.length < 2)
    throw new Error("Select at least two unlocked layers.");
  const b = selectionBounds(chosen),
    index = nodes.indexOf(chosen[0]);
  const group = makeNode("group", {
    name: "Group",
    matrix: translate(b.x, b.y),
    children: chosen,
  });
  chosen.forEach((n) => (n.matrix = multiply(translate(-b.x, -b.y), n.matrix)));
  const keep = nodes.filter((n) => !chosen.includes(n));
  keep.splice(index, 0, group);
  nodes.splice(0, nodes.length, ...keep);
  return group;
}
export function ungroupNode(nodes, id, project = null) {
  const index = nodes.findIndex((n) => n.id === id),
    g = nodes[index];
  if (!g || g.type !== "group" || g.locked) return [];
  if (MODES.some((m) => g.motion[m].length))
    throw new Error(
      "Clear group motion before ungrouping, so animation is not lost.",
    );
  if (g.opacity !== 1)
    throw new Error(
      "Set group opacity to 100% before ungrouping to preserve overlapping transparency.",
    );
  for (const child of g.children) {
    child.matrix = multiply(g.matrix, child.matrix);
    child.visible = child.visible && g.visible;
    child.factIds = [...new Set([...g.factIds, ...child.factIds])];
    if (g.role === "background") child.role = "background";
  }
  if (project)
    for (const track of Object.values(project.tracks))
      for (const cue of track.cues)
        cue.layerIds = [
          ...new Set(
            cue.layerIds.flatMap((v) =>
              v === id ? g.children.map((c) => c.id) : [v],
            ),
          ),
        ];
  nodes.splice(index, 1, ...g.children);
  return g.children;
}
export function duplicateNodes(nodes, ids, project) {
  const copies = [],
    map = new Map();
  function copy(n) {
    const v = clone(n);
    const reId = (node) => {
      const old = node.id;
      node.id = uid("layer");
      map.set(old, node.id);
      node.children?.forEach(reId);
    };
    reId(v);
    v.name += " copy";
    v.matrix = multiply(translate(24, 24), v.matrix);
    return v;
  }
  for (const n of [...nodes])
    if (ids.includes(n.id) && !n.locked) {
      const c = copy(n);
      nodes.splice(nodes.indexOf(n) + 1, 0, c);
      copies.push(c);
    }
  // Duplicates carry fact links and motion, but are deliberately not added to
  // existing caption highlight lists until an author chooses them.
  return copies;
}
export function removeNodes(nodes, ids, project) {
  const gone = new Set(
    flatten(nodes.filter((n) => ids.includes(n.id) && !n.locked)).map(
      (n) => n.id,
    ),
  );
  nodes.splice(0, nodes.length, ...nodes.filter((n) => !gone.has(n.id)));
  function prune(list) {
    for (let i = list.length - 1; i >= 0; i--) {
      const n = list[i];
      if (n.children) {
        prune(n.children);
        if (!n.children.length) {
          gone.add(n.id);
          list.splice(i, 1);
        }
      }
    }
  }
  prune(project.nodes);
  for (const mode of MODES)
    for (const cue of project.tracks[mode].cues)
      cue.layerIds = cue.layerIds.filter((id) => !gone.has(id));
}
export function moveLayer(nodes, id, delta) {
  const i = nodes.findIndex((n) => n.id === id),
    j = Math.max(0, Math.min(nodes.length - 1, i + delta));
  if (i < 0 || nodes[i].locked) return;
  const [n] = nodes.splice(i, 1);
  nodes.splice(j, 0, n);
}
const assert = (ok, msg) => {
  if (!ok) throw new Error(msg);
};
const number = (x, min, max, label) =>
  assert(Number.isFinite(x) && x >= min && x <= max, `Invalid ${label}.`);
const string = (s, max, label) =>
  assert(typeof s === "string" && s.length <= max, `Invalid ${label}.`);
const id = (s) =>
  assert(
    typeof s === "string" && /^[A-Za-z0-9][A-Za-z0-9_-]{0,79}$/.test(s),
    "Invalid identifier.",
  );
const paint = (c) =>
  assert(
    typeof c === "string" && /^(#[0-9a-fA-F]{6}|none)$/.test(c),
    "Colors must be six-digit hex or none.",
  );
function list(a, max, label) {
  assert(Array.isArray(a) && a.length <= max, `Invalid ${label}.`);
}
function matrix(m) {
  list(m, 6, "transform");
  assert(m.length === 6, "Transform needs six values.");
  m.forEach((v) => number(v, -1e6, 1e6, "transform"));
  assert(Math.abs(m[0] * m[3] - m[1] * m[2]) > 1e-10, "Singular transform.");
}
export function validateProject(p) {
  assert(
    p && typeof p === "object" && p.schema === SCHEMA,
    "Unsupported Studio project format.",
  );
  id(p.id);
  string(p.title, 200, "title");
  number(p.width, 64, 4096, "canvas width");
  number(p.height, 64, 4096, "canvas height");
  paint(p.background);
  assert(
    ["TECHNICAL_DEMO", "USER_SOURCE", "EXTERNAL_REVIEW"].includes(
      p.contentType,
    ),
    "Invalid content type.",
  );
  list(p.nodes, LIMITS.nodes, "layers");
  list(p.sources, 100, "sources");
  list(p.facts, 5000, "facts");
  assert(
    p.assets && typeof p.assets === "object" && !Array.isArray(p.assets),
    "Invalid asset collection.",
  );
  const assets = Object.entries(p.assets);
  assert(assets.length <= LIMITS.assets, "Too many assets.");
  let assetBytes = 0;
  for (const [key, a] of assets) {
    id(key);
    assert(a && typeof a === "object", "Invalid asset.");
    string(a.name, 300, "asset name");
    assert(
      ["image/png", "image/jpeg", "image/webp", "audio/wav"].includes(a.mime),
      "Unsupported asset type.",
    );
    assert(
      typeof a.data === "string" && a.data.startsWith(`data:${a.mime};base64,`),
      "Only embedded local image/WAV assets are allowed.",
    );
    const data = a.data.slice(a.data.indexOf(",") + 1);
    assert(
      data.length > 0 &&
        data.length <= Math.ceil(LIMITS.assetBytes / 3) * 4 &&
        /^[A-Za-z0-9+/]*={0,2}$/.test(data) &&
        data.length % 4 === 0,
      "Invalid or oversized asset data.",
    );
    const size =
      (data.length / 4) * 3 -
      (data.endsWith("==") ? 2 : data.endsWith("=") ? 1 : 0);
    assert(size <= LIMITS.assetBytes, "Asset exceeds 32 MiB.");
    assetBytes += size;
    if (a.mime === "audio/wav") {
      number(a.durationMs, 1000, 240000, "WAV duration");
      list(a.waveform, 160, "waveform");
      a.waveform.forEach((v) => number(v, 0, 1, "waveform peak"));
    }
    if (a.mime.startsWith("image/")) {
      number(a.width, 1, 4096, "image width");
      number(a.height, 1, 4096, "image height");
    }
  }
  assert(
    assetBytes <= 96 * 1024 * 1024,
    "Embedded assets exceed the 96 MiB project budget.",
  );
  const sourceIds = new Set();
  for (const s of p.sources) {
    id(s.id);
    assert(!sourceIds.has(s.id), "Duplicate source ID.");
    sourceIds.add(s.id);
    string(s.title, 500, "source title");
    if (s.externalUrl !== undefined) {
      string(s.externalUrl, 2000, "external source URL");
      const url = new URL(s.externalUrl);
      assert(
        url.protocol === "https:" &&
          url.hostname &&
          !url.username &&
          !url.password,
        "External source URL must be HTTPS without credentials.",
      );
    }
    assert(
      typeof s.userProvided === "boolean",
      "Source origin must be explicit.",
    );
    string(s.sha256, 64, "source checksum");
    assert(
      s.sha256 === "" || /^[a-f0-9]{64}$/.test(s.sha256),
      "Invalid source checksum.",
    );
    assert(
      s.excerpts &&
        typeof s.excerpts === "object" &&
        !Array.isArray(s.excerpts),
      "Invalid excerpts.",
    );
    assert(Object.keys(s.excerpts).length <= 1000, "Too many excerpts.");
    for (const [k, v] of Object.entries(s.excerpts)) {
      string(k, 500, "locator");
      string(v, 200000, "excerpt");
    }
  }
  const factIds = new Set();
  for (const f of p.facts) {
    id(f.id);
    assert(!factIds.has(f.id), "Duplicate fact ID.");
    factIds.add(f.id);
    string(f.text, 10000, "fact");
    list(f.sources, 100, "fact references");
    for (const r of f.sources) {
      assert(sourceIds.has(r.sourceId), "Missing fact source.");
      string(r.locator, 500, "locator");
      string(r.quote, 200000, "quote");
    }
  }
  let count = 0;
  const nodeIds = new Set();
  function node(n, depth) {
    assert(
      depth <= LIMITS.depth && ++count <= LIMITS.nodes,
      "Layer nesting/count limit exceeded.",
    );
    id(n.id);
    assert(!nodeIds.has(n.id), "Duplicate layer ID.");
    nodeIds.add(n.id);
    assert(
      ["rect", "ellipse", "path", "text", "image", "group"].includes(n.type),
      "Unsupported layer type.",
    );
    string(n.name, 200, "layer name");
    assert(
      n.role === undefined || ["element", "background"].includes(n.role),
      "Invalid layer role.",
    );
    matrix(n.matrix);
    number(n.width, 1, 32768, "layer width");
    number(n.height, 1, 32768, "layer height");
    paint(n.fill);
    paint(n.stroke);
    number(n.strokeWidth, 0, 200, "stroke");
    number(n.opacity, 0, 1, "opacity");
    assert(
      typeof n.visible === "boolean" && typeof n.locked === "boolean",
      "Invalid visibility/lock.",
    );
    list(n.factIds, 100, "layer facts");
    n.factIds.forEach((f) => assert(factIds.has(f), "Missing layer fact."));
    if (n.type === "rect") number(n.radius, 0, 32768, "corner radius");
    if (n.type === "text") {
      string(n.text, 10000, "text");
      number(n.fontSize, 4, 600, "font size");
      assert(
        ["sans-serif", "serif", "monospace"].includes(n.fontFamily),
        "Unsupported font.",
      );
      assert(
        ["400", "600", "700"].includes(n.fontWeight),
        "Invalid font weight.",
      );
    }
    if (n.type === "path") {
      list(n.points, 4000, "path points");
      assert(n.points.length >= 2, "Paths need two points.");
      assert(typeof n.closed === "boolean", "Invalid path closure.");
      for (const pt of n.points) {
        number(pt.x, -32768, 32768, "path point");
        number(pt.y, -32768, 32768, "path point");
        for (const key of ["in", "out"])
          if (pt[key]) {
            number(pt[key].x, -32768, 32768, "handle");
            number(pt[key].y, -32768, 32768, "handle");
          }
      }
    }
    if (n.type === "image")
      assert(
        Object.hasOwn(p.assets, n.assetId) &&
          p.assets[n.assetId].mime.startsWith("image/"),
        "Missing image asset.",
      );
    if (n.type === "group") {
      list(n.children, LIMITS.nodes, "group");
      assert(n.children.length > 0, "Empty group.");
      n.children.forEach((c) => node(c, depth + 1));
    }
    assert(n.motion && typeof n.motion === "object", "Missing motion data.");
    for (const mode of MODES) {
      list(n.motion[mode], 200, "keyframes");
      let last = -1;
      for (const k of n.motion[mode]) {
        number(k.atMs, 0, 240000, "keyframe time");
        assert(k.atMs > last, "Keyframes must be ordered and unique.");
        last = k.atMs;
        number(k.dx, -32768, 32768, "motion x");
        number(k.dy, -32768, 32768, "motion y");
        number(k.scale, 0.1, 10, "motion scale");
        number(k.rotation, -3600, 3600, "motion rotation");
      }
    }
  }
  p.nodes.forEach((n) => node(n, 0));
  for (const mode of MODES) {
    const t = p.tracks?.[mode];
    assert(t && typeof t === "object", "Missing narration track.");
    number(t.durationMs, 1000, 240000, "track duration");
    assert(
      t.audioAssetId === null ||
        (Object.hasOwn(p.assets, t.audioAssetId) &&
          p.assets[t.audioAssetId].mime === "audio/wav"),
      "Missing audio asset.",
    );
    list(t.cues, 1000, "cues");
    let last = 0;
    const cueIds = new Set();
    for (const c of t.cues) {
      id(c.id);
      assert(!cueIds.has(c.id), "Duplicate cue ID.");
      cueIds.add(c.id);
      number(c.startMs, 0, t.durationMs, "cue start");
      number(c.endMs, c.startMs + 1, t.durationMs, "cue end");
      assert(c.startMs >= last, "Cues overlap or are unsorted.");
      last = c.endMs;
      string(c.text, 10000, "cue text");
      list(c.factIds, 100, "cue facts");
      list(c.layerIds, 500, "cue layers");
      c.factIds.forEach((v) => assert(factIds.has(v), "Missing cue fact."));
      c.layerIds.forEach((v) => assert(nodeIds.has(v), "Missing cue layer."));
      assert(["LINEAR", "EASE_IN_OUT"].includes(c.easing), "Invalid easing.");
      if (c.camera) {
        if (c.cameraDurationMs !== undefined)
          number(c.cameraDurationMs, 1, c.endMs - c.startMs, "camera duration");
        for (const key of ["x", "y"])
          number(c.camera[key], 0, 1, "camera position");
        for (const key of ["width", "height"])
          number(c.camera[key], 0.001, 1, "camera size");
        assert(
          c.camera.x + c.camera.width <= 1.000001 &&
            c.camera.y + c.camera.height <= 1.000001,
          "Camera extends beyond scene.",
        );
      }
    }
    for (const n of flatten(p.nodes))
      assert(
        n.motion[mode].every((k) => k.atMs <= t.durationMs),
        "Keyframe exceeds track duration.",
      );
  }
  assert(
    p.quality &&
      typeof p.quality.sourceCoverageReviewed === "boolean" &&
      typeof p.quality.audioReviewed === "boolean",
    "Missing review status.",
  );
  string(p.quality.reviewer, 500, "reviewer");
  string(p.quality.notes, 10000, "review notes");
  return p;
}
export function readiness(p) {
  const issues = [];
  for (const s of p.sources)
    if (!s.sha256)
      issues.push(`${s.title}: original source checksum is missing.`);
  if (!p.facts.length) issues.push("Add source-linked facts.");
  for (const f of p.facts) {
    if (!f.text.trim() || !f.sources.length)
      issues.push(`${f.id}: fact or source reference is missing.`);
    for (const r of f.sources) {
      const s = p.sources.find((v) => v.id === r.sourceId);
      if (
        !r.quote.trim() ||
        !s ||
        !Object.hasOwn(s.excerpts, r.locator) ||
        !s.excerpts[r.locator].includes(r.quote)
      )
        issues.push(`${f.id}: quote must match its source excerpt exactly.`);
    }
  }
  for (const mode of MODES) {
    const t = p.tracks[mode];
    if (!t.audioAssetId)
      issues.push(`${mode}: attach real Breeze CPU WAV narration.`);
    if (t.durationMs < 60000 || t.durationMs > 240000)
      issues.push(`${mode}: duration must be 1–4 minutes for Android.`);
    const covered = new Set(t.cues.flatMap((c) => c.factIds));
    for (const f of p.facts)
      if (!covered.has(f.id))
        issues.push(`${mode}: ${f.id} has no narration cue.`);
    let last = 0;
    for (const c of t.cues) {
      if (c.startMs !== last || !c.text.trim())
        issues.push(
          `${mode}: captions need complete text and continuous timing.`,
        );
      last = c.endMs;
    }
    if (last !== t.durationMs)
      issues.push(`${mode}: cues do not cover the full track.`);
  }
  if (p.contentType === "USER_SOURCE" && p.sources.some((s) => !s.userProvided))
    issues.push("User-source lessons require learner-supplied sources.");
  if (p.contentType === "EXTERNAL_REVIEW")
    issues.push(
      "External medical demonstrations require schema 2, HTTPS source attribution and a visible review label. Use the measured Studio production bridge.",
    );
  issues.push(
    "Breeze generation provenance and human listening/source review must be completed in the production workflow.",
  );
  if (flatten(p.nodes).some((n) => MODES.some((m) => n.motion[m].length)))
    issues.push(
      "Independent layer motion requires the transparent layer export and Android schema 2 production bridge.",
    );
  return [...new Set(issues)];
}
