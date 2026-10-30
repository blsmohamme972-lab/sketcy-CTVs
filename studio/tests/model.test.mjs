import test from "node:test";
import assert from "node:assert/strict";
import {
  emptyProject,
  makeNode,
  validateProject,
  snapshot,
  History,
  groupNodes,
  ungroupNode,
  removeNodes,
  duplicateNodes,
  flatten,
  readiness,
} from "../src/model.mjs";
import { demoProject } from "../src/demo.mjs";
import {
  multiply,
  translate,
  rotate,
  scale,
  point,
  inverse,
  bounds,
  selectionBounds,
  cameraViewport,
} from "../src/geometry.mjs";
import { svgDocument } from "../src/scene.mjs";
import { handoff } from "../src/export.mjs";

test("camera viewport contains tall and wide focus regions without cropping at artboard edges", () => {
  for (const region of [
    { x: 0.31, y: 0.24, width: 0.34, height: 0.5 },
    { x: 0, y: 0.85, width: 0.75, height: 0.15 },
    { x: 0.9, y: 0, width: 0.1, height: 0.8 },
  ]) {
    const view = cameraViewport(region);
    assert.equal(view.width, view.height);
    assert.ok(view.x >= 0 && view.y >= 0);
    assert.ok(view.x <= region.x + 1e-9 && view.y <= region.y + 1e-9);
    assert.ok(view.x + view.width >= region.x + region.width - 1e-9);
    assert.ok(view.y + view.height >= region.y + region.height - 1e-9);
    assert.ok(view.x + view.width <= 1 && view.y + view.height <= 1);
  }
});

test("empty and complete neutral example validate and serialize losslessly", () => {
  for (const p of [emptyProject(), demoProject()])
    assert.deepEqual(validateProject(JSON.parse(JSON.stringify(p))), p);
});
test("group and ungroup preserve arbitrary affine child transforms", () => {
  const p = emptyProject(),
    a = makeNode("rect", { matrix: multiply(translate(120, 80), rotate(25)) }),
    b = makeNode("ellipse", {
      matrix: multiply(translate(340, 150), scale(1.3, 0.7)),
    });
  p.nodes = [a, b];
  const originals = p.nodes.map((n) => [...n.matrix]);
  const g = groupNodes(p.nodes, [a.id, b.id]);
  g.matrix = multiply(rotate(18), multiply(scale(1.2, 0.6), g.matrix));
  const expected = g.children.map((n) => multiply(g.matrix, n.matrix));
  ungroupNode(p.nodes, g.id);
  for (let i = 0; i < 2; i++)
    p.nodes[i].matrix.forEach((v, j) =>
      assert.ok(Math.abs(v - expected[i][j]) < 1e-8),
    );
  assert.notDeepEqual(p.nodes[0].matrix, originals[0]);
});
test("locked objects are not grouped or deleted", () => {
  const p = emptyProject(),
    a = makeNode("rect", { locked: true }),
    b = makeNode("rect");
  p.nodes = [a, b];
  assert.throws(() => groupNodes(p.nodes, [a.id, b.id]), /two unlocked/);
  removeNodes(p.nodes, [a.id, b.id], p);
  assert.equal(p.nodes.length, 1);
  assert.equal(p.nodes[0].id, a.id);
});
test("ungroup rejects animation that would otherwise be lost", () => {
  const p = emptyProject();
  p.nodes = [makeNode("rect"), makeNode("ellipse")];
  const g = groupNodes(
    p.nodes,
    p.nodes.map((n) => n.id),
  );
  g.motion.explanation = [{ atMs: 0, dx: 0, dy: 0, scale: 1, rotation: 0 }];
  assert.throws(() => ungroupNode(p.nodes, g.id), /Clear group motion/);
});
test("deleting a group removes descendant highlight references", () => {
  const p = demoProject(),
    g = p.nodes.find((n) => n.name.startsWith("Lantern")),
    child = g.children[0];
  p.tracks.explanation.cues[0].layerIds.push(child.id);
  removeNodes(p.nodes, [g.id], p);
  assert.equal(p.tracks.explanation.cues[0].layerIds.length, 0);
  validateProject(p);
});
test("duplicating groups makes every descendant identity unique", () => {
  const p = demoProject(),
    g = p.nodes[1];
  duplicateNodes(p.nodes, [g.id], p);
  const ids = flatten(p.nodes).map((n) => n.id);
  assert.equal(ids.length, new Set(ids).size);
  validateProject(p);
});
test("history is one snapshot per gesture and redo is invalidated by a new change", () => {
  const p = emptyProject();
  p.nodes = [makeNode("rect")];
  const h = new History(),
    before = snapshot(p);
  for (let i = 0; i < 20; i++) p.nodes[0].matrix[4] = i;
  h.record(before, "Move");
  assert.equal(h.past.length, 1);
  const undone = h.undo(p);
  assert.equal(undone.project.nodes[0].matrix[4], 0);
  assert.equal(h.redo(undone.project).project.nodes[0].matrix[4], 19);
  h.undo(p);
  h.record(snapshot(p), "Other");
  assert.equal(h.future.length, 0);
});
test("history media are shared immutable values but geometry is independent", () => {
  const p = emptyProject();
  p.assets.a = { data: "immutable" };
  p.nodes = [makeNode("rect")];
  const s = snapshot(p);
  assert.equal(s.assets.a, p.assets.a);
  p.nodes[0].matrix[0] = 3;
  assert.equal(s.nodes[0].matrix[0], 1);
});
test("matrix inverse maps transformed points back without drift", () => {
  const m = multiply(translate(31, -71), multiply(rotate(22), scale(2, 0.4))),
    p = { x: 99, y: 25 },
    q = point(inverse(m), point(m, p));
  assert.ok(Math.abs(p.x - q.x) < 1e-9 && Math.abs(p.y - q.y) < 1e-9);
});
test("rotated bounds include all corners and off-origin nested groups", () => {
  const n = makeNode("rect", {
      width: 100,
      height: 50,
      matrix: multiply(translate(20, 30), rotate(90)),
    }),
    b = bounds(n);
  assert.ok(Math.abs(b.x + 30) < 1e-9);
  assert.ok(Math.abs(b.width - 50) < 1e-9);
  assert.ok(Math.abs(b.height - 100) < 1e-9);
});
test("unknown project version is rejected", () => {
  const p = emptyProject();
  p.schema = "other";
  assert.throws(() => validateProject(p), /Unsupported/);
});
test("remote and executable image URLs are rejected", () => {
  for (const data of [
    "https://example.com/a.png",
    "javascript:alert(1)",
    "data:image/svg+xml;base64,PHN2Zz4=",
  ]) {
    const p = emptyProject();
    p.assets.a = { name: "x", mime: "image/png", data, width: 1, height: 1 };
    assert.throws(() => validateProject(p), /embedded local/);
  }
});
test("duplicate nested IDs and unknown fact references are rejected", () => {
  const p = demoProject();
  p.nodes[1].children[0].id = p.nodes[0].id;
  assert.throws(() => validateProject(p), /Duplicate layer/);
  const q = demoProject();
  q.nodes[1].factIds = ["not-a-fact"];
  assert.throws(() => validateProject(q), /Missing layer fact/);
});
test("invalid colors cannot inject SVG paint servers or markup", () => {
  for (const color of [
    "url(https://evil.test/x)",
    '"/><script>evil()</script>',
    "red",
  ]) {
    const p = emptyProject();
    p.nodes = [makeNode("rect", { fill: color })];
    assert.throws(() => validateProject(p), /Colors/);
  }
});
test("nonfinite and singular transforms are rejected", () => {
  for (const matrix of [
    [1, 0, 0, 1, Infinity, 0],
    [1, 0, 0, 0, 0, 0],
  ]) {
    const p = emptyProject();
    p.nodes = [makeNode("rect", { matrix })];
    assert.throws(() => validateProject(p), /transform/i);
  }
});
test("overlapping cues and motion beyond duration are rejected", () => {
  const p = demoProject();
  p.tracks.story.cues[1].startMs = 20000;
  assert.throws(() => validateProject(p), /overlap/);
  const q = demoProject();
  q.nodes[1].motion.story = [
    { atMs: 100000, dx: 0, dy: 0, scale: 1, rotation: 0 },
  ];
  assert.throws(() => validateProject(q), /exceeds/);
});
test("out-of-frame camera regions are rejected", () => {
  const p = demoProject();
  p.tracks.story.cues[0].camera = { x: 0.8, y: 0, width: 0.5, height: 1 };
  assert.throws(() => validateProject(p), /beyond scene/);
});
test("text and titles are XML-escaped in standalone vector exports", () => {
  const p = emptyProject("<script>alert(1)</script>");
  p.nodes = [
    makeNode("text", { text: '<img src=x onerror=alert(1)>& "test"' }),
  ];
  const out = svgDocument(p);
  assert.ok(out.includes("&lt;script&gt;"));
  assert.ok(out.includes("&lt;img"));
  assert.ok(!out.includes("<script>"));
  assert.ok(!out.includes("<img"));
});
test("hidden artwork and selection overlays are absent from SVG export", () => {
  const p = emptyProject();
  p.nodes = [
    makeNode("rect", { id: "secret-layer", visible: false }),
    makeNode("ellipse", { id: "visible-layer" }),
  ];
  const svg = svgDocument(p);
  assert.ok(!svg.includes("secret-layer"));
  assert.ok(svg.includes("visible-layer"));
  assert.ok(!svg.includes("selection-overlay"));
});
test("production handoff preserves source quotes and never grants approval", () => {
  const p = demoProject(),
    out = handoff(p);
  assert.equal(out.releaseReady, false);
  assert.deepEqual(out.lesson.sources, p.sources);
  assert.deepEqual(out.lesson.facts, p.facts);
  assert.equal(out.lesson.quality.audioReviewed, false);
  assert.equal(out.lesson.quality.sourceCoverageReviewed, false);
  assert.equal(
    out.narrationPlan.parts[0].tracks.story[0].factIds[0],
    "plant-fact",
  );
  assert.ok(out.issues.some((i) => i.includes("provenance")));
});
test("source mismatch is reported as an authoring issue, never certified by IDs", () => {
  const p = demoProject();
  p.facts[0].sources[0].quote = "This was invented.";
  assert.ok(readiness(p).some((i) => i.includes("quote must match")));
});
test("ungroup preserves group fact links and retargets caption highlights", () => {
  const p = demoProject(),
    g = p.nodes.find((n) => n.name.startsWith("Plant"));
  const children = g.children.map((n) => n.id);
  ungroupNode(p.nodes, g.id, p);
  assert.deepEqual(p.tracks.story.cues[0].layerIds, children);
  assert.ok(
    p.nodes
      .filter((n) => children.includes(n.id))
      .every((n) => n.factIds.includes("plant-fact")),
  );
  validateProject(p);
});
test("deleting the final group child removes the empty container and its cue links", () => {
  const p = demoProject(),
    g = p.nodes.find((n) => n.name.startsWith("Plant"));
  removeNodes(
    g.children,
    g.children.map((n) => n.id),
    p,
  );
  assert.ok(!p.nodes.includes(g));
  assert.deepEqual(p.tracks.story.cues[0].layerIds, []);
  validateProject(p);
});
test("ungroup refuses a lossy overlapping-opacity conversion", () => {
  const g = makeNode("group", {
    children: [makeNode("rect"), makeNode("ellipse")],
    opacity: 0.5,
  });
  assert.throws(() => ungroupNode([g], g.id), /overlapping transparency/);
});
