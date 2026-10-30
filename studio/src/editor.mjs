import {
  emptyProject,
  makeNode,
  uid,
  clone,
  snapshot,
  History,
  MODES,
  LIMITS,
  flatten,
  findNode,
  scopeNodes,
  scopeMatrix,
  groupNodes,
  ungroupNode,
  duplicateNodes,
  removeNodes,
  moveLayer,
  validateProject,
  readiness,
} from "./model.mjs";
import {
  IDENTITY,
  translate,
  scale,
  rotate,
  around,
  multiply,
  inverse,
  point,
  bounds,
  localBounds,
  selectionBounds,
  transformBox,
  union,
  fitRegion,
  cameraViewport,
  clamp,
  round,
} from "./geometry.mjs";
import {
  frameAt,
  switchPosition,
  motionAt,
  animatedMatrix,
  putKeyframe,
} from "./timeline.mjs";
import {
  imageAsset,
  audioAsset,
  verifyAssets,
  retimeTrack,
} from "./assets.mjs";
import { recover, Autosave } from "./persistence.mjs";
import { esc, artworkMarkup, pathData } from "./scene.mjs";
import {
  download,
  filename,
  projectBlob,
  svgBlob,
  pngBlob,
  selectionBox,
  handoff,
} from "./export.mjs";
import { demoProject } from "./demo.mjs";
import { TOOLS } from "./icons.mjs";

const $ = (selector) => document.querySelector(selector),
  $$ = (selector) => [...document.querySelectorAll(selector)];
let project = demoProject(),
  selection = new Set(),
  scope = [],
  tab = "layers",
  tool = "select",
  mode = "explanation";
let preview = false,
  reduced = matchMedia("(prefers-reduced-motion: reduce)").matches,
  time = 0,
  speed = 1,
  playing = false,
  zoom = 0.4,
  grid = false,
  snap = false;
let gesture = null,
  pathDraft = null,
  spaceDown = false,
  activePoint = null,
  modalSubmit = null,
  toastTimer = null,
  raf = null,
  silentOrigin = 0,
  silentStart = 0;
let audioKey = "",
  audioEpoch = 0,
  desiredSeek = 0,
  documentEpoch = 0,
  unsavedDownload = false;
const history = new History(),
  audio = $("#narration"),
  stage = $("#artboard"),
  scroll = $("#stage-scroll");
const autosave = new Autosave((status, error) => {
  const el = $("#save-status");
  el.dataset.status = status;
  el.textContent =
    status === "saved"
      ? "Recovery saved on this computer"
      : status === "pending"
        ? "Saving local recovery…"
        : "Recovery unavailable · save a project file";
  if (error)
    toast(
      "Local recovery could not be saved. Use Save project to keep your work.",
      true,
    );
});
const currentNodes = () => scopeNodes(project, scope) || project.nodes;
const selected = () => currentNodes().filter((n) => selection.has(n.id));
const editable = () => selected().filter((n) => !n.locked);
const currentTrack = () => project.tracks[mode];
const fmt = (ms) =>
  `${String(Math.floor(ms / 60000)).padStart(2, "0")}:${String(Math.floor(ms / 1000) % 60).padStart(2, "0")}`;
const iconFor = (n) =>
  ({ group: "▧", image: "▧", rect: "□", ellipse: "○", path: "⌁", text: "T" })[
    n.type
  ];
export const getProject = () => snapshot(project);
export const getPlayback = () => ({
  mode,
  time,
  preview,
  playing,
  reduced,
  audioTime: audio.currentTime,
});

function toast(message, error = false) {
  clearTimeout(toastTimer);
  const el = $("#toast");
  el.textContent = message;
  el.classList.toggle("error", error);
  el.hidden = false;
  toastTimer = setTimeout(() => (el.hidden = true), error ? 9000 : 4500);
}
function markChanged() {
  documentEpoch++;
  unsavedDownload = true;
  autosave.schedule(project);
}
function tidySelection() {
  const nodes = scopeNodes(project, scope);
  if (!nodes) {
    scope = [];
    selection.clear();
  } else
    selection = new Set(
      [...selection].filter((id) => nodes.some((n) => n.id === id)),
    );
}
function commit(label, change) {
  if (gesture) cancelGesture();
  const before = snapshot(project);
  try {
    change();
    validateProject(project);
    history.record(before, label);
    tidySelection();
    markChanged();
    draw();
    return true;
  } catch (error) {
    project = before;
    tidySelection();
    draw();
    toast(error.message, true);
    return false;
  }
}
function undo() {
  pause();
  const e = history.undo(project);
  if (e) {
    project = e.project;
    tidySelection();
    time = Math.min(time, currentTrack().durationMs);
    syncAudio();
    markChanged();
    draw();
    toast(`Undid ${e.label.toLowerCase()}.`);
  }
}
function redo() {
  pause();
  const e = history.redo(project);
  if (e) {
    project = e.project;
    tidySelection();
    time = Math.min(time, currentTrack().durationMs);
    syncAudio();
    markChanged();
    draw();
    toast(`Redid ${e.label.toLowerCase()}.`);
  }
}
function changeTool(next) {
  if (pathDraft) finishPath(false);
  tool = next;
  activePoint = null;
  preview = false;
  pause();
  draw();
}
function worldPoint(event) {
  return new DOMPoint(event.clientX, event.clientY).matrixTransform(
    stage.getScreenCTM().inverse(),
  );
}
function parentPoint(event) {
  const w = worldPoint(event);
  return point(inverse(scopeMatrix(project, scope)), w);
}
function snapped(p) {
  return snap
    ? { x: Math.round(p.x / 20) * 20, y: Math.round(p.y / 20) * 20 }
    : p;
}
function visibleWorldBoxes() {
  const boxes = new Map();
  function walk(nodes, parent) {
    for (const n of nodes) {
      if (!n.visible) continue;
      const m = multiply(
        parent,
        preview ? animatedMatrix(n, mode, time, reduced) : n.matrix,
      );
      boxes.set(n.id, transformBox(localBounds(n), m));
      if (n.children) walk(n.children, m);
    }
  }
  walk(project.nodes, IDENTITY);
  return boxes;
}
function drawTools() {
  $("#toolrail").innerHTML = TOOLS.map(
    (t, i) =>
      `${i === 3 || i === 7 ? '<span class="tool-divider"></span>' : ""}<button data-tool="${t.id}" title="${t.name} (${t.key})" aria-label="${t.name}" aria-pressed="${tool === t.id}" class="${tool === t.id ? "active" : ""}">${t.icon}</button>`,
  ).join("");
  stage.dataset.tool = tool;
}
function draw() {
  drawTools();
  drawLeft();
  drawInspector();
  drawTimeline();
  drawScene();
  $("#project-title").value = project.title;
  $("#undo").disabled = !history.past.length;
  $("#redo").disabled = !history.future.length;
  $("#design-mode").classList.toggle("active", !preview);
  $("#preview-mode").classList.toggle("active", preview);
  $("#grid-toggle").classList.toggle("active", grid);
  $("#grid-toggle").setAttribute("aria-pressed", grid);
  $("#snap-toggle").classList.toggle("active", snap);
  $("#snap-toggle").setAttribute("aria-pressed", snap);
  $("#scope-label").textContent = scope.length
    ? ` / ${findNode(project, scope.at(-1))?.name || "Group"}`
    : " / Artboard";
  $("#leave-group").hidden = !scope.length;
  $("#canvas-size").textContent = `${project.width} × ${project.height}`;
  $("#object-count").textContent = `${flatten(project.nodes).length} objects`;
  $("#reduced-motion").checked = reduced;
  applyZoom();
}
function drawScene() {
  const frame = frameAt(currentTrack(), time, reduced);
  $("#artwork").innerHTML = artworkMarkup(project, {
    animate: preview,
    mode,
    time,
    reducedMotion: reduced,
  });
  const cam = preview
    ? cameraViewport(frame.camera)
    : { x: 0, y: 0, width: 1, height: 1 };
  stage.setAttribute(
    "viewBox",
    `${cam.x * project.width} ${cam.y * project.height} ${cam.width * project.width} ${cam.height * project.height}`,
  );
  stage.setAttribute(
    "preserveAspectRatio",
    preview ? "xMidYMid slice" : "xMidYMid meet",
  );
  $("#grid-overlay").innerHTML =
    grid && !preview
      ? `<defs><pattern id="author-grid" width="20" height="20" patternUnits="userSpaceOnUse"><path d="M20 0H0V20" fill="none" stroke="#527f79" stroke-opacity=".22" stroke-width="1"/></pattern></defs><rect width="${project.width}" height="${project.height}" fill="url(#author-grid)"/>`
      : "";
  const boxes = visibleWorldBoxes();
  $("#highlights").innerHTML = preview
    ? frame.layerIds
        .map((id) => {
          const b = boxes.get(id);
          return b
            ? `<rect x="${b.x - 7}" y="${b.y - 7}" width="${b.width + 14}" height="${b.height + 14}" fill="none" stroke="#e6bc55" stroke-width="4" rx="12" vector-effect="non-scaling-stroke"/>`
            : "";
        })
        .join("")
    : "";
  drawSelection();
  drawDraft();
  $("#caption-text").textContent = preview
    ? frame.caption || "No caption at this position."
    : scope.length
      ? "Editing inside a group. Leave group to return to the full composition."
      : "Select an object to shape the scene. Double-click a group to edit its contents.";
  $(".caption-label").textContent = preview ? "CAPTION" : "SCENE NOTES";
  updateTime();
}
function drawSelection() {
  const el = $("#selection-overlay");
  if (preview || !selected().length) {
    el.innerHTML = "";
    return;
  }
  const nodes = selected(),
    b = selectionBounds(nodes),
    m = scopeMatrix(project, scope),
    size =
      5 /
      (zoom * Math.max(0.05, Math.sqrt(Math.abs(m[0] * m[3] - m[1] * m[2])))),
    editableNodes = editable();
  let body = `<rect x="${b.x}" y="${b.y}" width="${Math.max(1, b.width)}" height="${Math.max(1, b.height)}" fill="none" stroke="#56879b" stroke-width="1.3" vector-effect="non-scaling-stroke" pointer-events="none"/>`;
  if (editableNodes.length === nodes.length && tool !== "nodes") {
    for (const [handle, x, y] of [
      ["nw", b.x, b.y],
      ["ne", b.x + b.width, b.y],
      ["se", b.x + b.width, b.y + b.height],
      ["sw", b.x, b.y + b.height],
    ])
      body += `<rect data-handle="${handle}" x="${x - size}" y="${y - size}" width="${size * 2}" height="${size * 2}" fill="#fffdf0" stroke="#56879b" stroke-width="1.2" vector-effect="non-scaling-stroke" style="cursor:${handle}-resize"/>`;
    body += `<path d="M${b.x + b.width / 2} ${b.y}v${-size * 5}" stroke="#56879b" vector-effect="non-scaling-stroke"/><circle data-handle="rotate" cx="${b.x + b.width / 2}" cy="${b.y - size * 5}" r="${size}" fill="#fffdf0" stroke="#56879b" vector-effect="non-scaling-stroke" style="cursor:crosshair"/>`;
  }
  if (
    tool === "nodes" &&
    nodes.length === 1 &&
    nodes[0].type === "path" &&
    !nodes[0].locked
  ) {
    const n = nodes[0];
    body += `<g transform="matrix(${n.matrix.join(" ")})">`;
    n.points.forEach((pt, i) => {
      for (const side of ["in", "out"])
        if (pt[side])
          body += `<path d="M${pt.x} ${pt.y}L${pt[side].x} ${pt[side].y}" stroke="#56879b" vector-effect="non-scaling-stroke"/><circle data-point="${i}" data-side="${side}" cx="${pt[side].x}" cy="${pt[side].y}" r="${size * 0.75}" fill="#e7bd73" stroke="#56879b" vector-effect="non-scaling-stroke"/>`;
      body += `<rect data-point="${i}" data-side="anchor" x="${pt.x - size}" y="${pt.y - size}" width="${size * 2}" height="${size * 2}" fill="${activePoint === i ? "#e7bd73" : "#fffdf0"}" stroke="#56879b" vector-effect="non-scaling-stroke"/>`;
    });
    body += "</g>";
  }
  el.innerHTML = `<g transform="matrix(${m.join(" ")})">${body}</g>`;
}
function drawDraft() {
  if (!pathDraft) {
    $("#drawing-overlay").innerHTML = "";
    return;
  }
  const n = makeNode("path", {
    points: pathDraft.points,
    fill: "none",
    closed: false,
  });
  $("#drawing-overlay").innerHTML =
    `<g transform="matrix(${scopeMatrix(project, scope).join(" ")})"><path d="${pathData(n)}" fill="none" stroke="#426e83" stroke-width="3" vector-effect="non-scaling-stroke"/>${pathDraft.points.map((p) => `<circle cx="${p.x}" cy="${p.y}" r="${4 / zoom}" fill="#eac57f" stroke="#426e83" vector-effect="non-scaling-stroke"/>`).join("")}</g>`;
}
function applyZoom() {
  const wrap = $("#stage-wrap");
  wrap.style.width = `${project.width * zoom}px`;
  wrap.style.height = `${project.height * zoom}px`;
  $("#zoom-label").textContent = `${Math.round(zoom * 100)}%`;
}
function fit() {
  zoom = clamp(
    Math.min(
      (scroll.clientWidth - 64) / project.width,
      (scroll.clientHeight - 64) / project.height,
    ),
    0.08,
    2,
  );
  applyZoom();
  scroll.scrollLeft = scroll.scrollTop = 0;
  drawSelection();
}
function zoomBy(factor) {
  const old = zoom;
  zoom = clamp(zoom * factor, 0.08, 4);
  const cx = scroll.scrollLeft + scroll.clientWidth / 2,
    cy = scroll.scrollTop + scroll.clientHeight / 2;
  applyZoom();
  scroll.scrollLeft = (cx * zoom) / old - scroll.clientWidth / 2;
  scroll.scrollTop = (cy * zoom) / old - scroll.clientHeight / 2;
  drawSelection();
}

function drawLeft() {
  for (const b of $$("[data-tab]"))
    b.classList.toggle("active", b.dataset.tab === tab);
  const container = $("#left-content");
  if (tab === "layers") {
    const nodes = currentNodes();
    container.innerHTML = `<div class="section-heading">${scope.length ? "GROUP CONTENTS" : "SCENE LAYERS"}<span>${nodes.length}</span></div>${
      nodes.length
        ? [...nodes]
            .reverse()
            .map(
              (n) =>
                `<div class="layer-row ${selection.has(n.id) ? "selected" : ""} ${n.visible ? "" : "hidden-layer"}" data-layer="${n.id}" tabindex="0" role="button" aria-label="Select ${esc(n.name)}"><span class="layer-swatch">${iconFor(n)}</span><span class="layer-label"><span class="layer-name">${esc(n.name)}</span><span class="layer-detail">${n.type === "group" ? n.children.length + " objects" : n.type}${n.factIds.length ? " · fact linked" : ""}</span></span><button data-visible="${n.id}" title="${n.visible ? "Hide" : "Show"} ${esc(n.name)}" aria-label="${n.visible ? "Hide" : "Show"} ${esc(n.name)}">${n.visible ? "◉" : "○"}</button><button data-lock="${n.id}" title="${n.locked ? "Unlock" : "Lock"} ${esc(n.name)}" aria-label="${n.locked ? "Unlock" : "Lock"} ${esc(n.name)}">${n.locked ? "▣" : "·"}</button></div>`,
            )
            .join("")
        : '<p class="empty-note"><strong>Your scene starts here.</strong>Draw a shape or import a background and transparent PNG elements.</p>'
    }<div class="layer-actions"><button data-action="duplicate">Duplicate</button><button data-action="raise">↑ Forward</button><button data-action="lower">↓ Back</button><button data-action="delete">Delete</button></div>`;
  }
  if (tab === "facts")
    container.innerHTML = `<div class="section-heading">FACT INVENTORY<button data-action="add-fact" aria-label="Add fact">+</button></div>${project.facts.map((f, i) => `<div class="fact-card" data-edit-fact="${f.id}" role="button" tabindex="0"><small>FACT ${String(i + 1).padStart(2, "0")}</small><p>${esc(f.text || "Untitled fact")}</p><span>${f.sources.length} source reference${f.sources.length === 1 ? "" : "s"} · ${flatten(project.nodes).filter((n) => n.factIds.includes(f.id)).length} objects</span></div>`).join("") || '<p class="empty-note">Add facts from the supplied source, preserving numbers, conditions and exceptions.</p>'}<div class="section-heading">SOURCES<button data-action="add-source" aria-label="Add source">+</button></div>${project.sources.map((s) => `<div class="source-card" data-edit-source="${s.id}" role="button" tabindex="0"><small>${s.userProvided ? "LEARNER SOURCE" : "OTHER / DEMO SOURCE"}</small><p>${esc(s.title)}</p><span>${Object.keys(s.excerpts).length} excerpt${Object.keys(s.excerpts).length === 1 ? "" : "s"}</span></div>`).join("")}<div class="layer-actions"><button data-action="import-source">Import extracted source JSON</button><button data-action="readiness">Check lesson readiness</button></div>`;
  if (tab === "assets")
    container.innerHTML = `<div class="section-heading">LOCAL MEDIA<button data-action="import-image" aria-label="Import artwork">+</button></div>${
      Object.entries(project.assets)
        .map(
          ([id, a]) =>
            `<div class="asset-card">${a.mime.startsWith("image/") ? `<div class="asset-thumb"><img src="${esc(a.data)}" alt="${esc(a.name)}"></div>` : ""}<div class="asset-info"><strong>${esc(a.name)}</strong><span>${a.mime === "audio/wav" ? fmt(a.durationMs) + " · origin unverified" : `${a.width} × ${a.height} · ${a.hasTransparency ? "transparent pixels" : "opaque image"}`}</span>${a.mime.startsWith("image/") ? `<button data-place-asset="${id}">+ Place in scene</button>` : ""}</div></div>`,
        )
        .join("") ||
      '<p class="empty-note"><strong>Bring the layers together.</strong>Import the background, characters and objects as separate images. PNG transparency is preserved.</p>'
    }`;
}
const field = (label, prop, value, extra = "") =>
  `<label>${label}<input data-prop="${prop}" aria-label="${label}" value="${esc(value)}" ${extra}></label>`;
function drawInspector() {
  const nodes = selected(),
    n = nodes.length === 1 ? nodes[0] : null;
  $("#selection-count").textContent = n
    ? n.type
    : nodes.length
      ? `${nodes.length} selected`
      : "Artboard";
  const el = $("#inspector");
  if (!nodes.length) {
    el.innerHTML = `<section class="inspector-section"><h3>Scene settings <span class="draft-badge">DRAFT</span></h3><div class="field-grid">${field("Width", "canvasWidth", project.width, 'type="number" min="64" max="4096"')}${field("Height", "canvasHeight", project.height, 'type="number" min="64" max="4096"')}</div><div class="color-row"><span>Canvas color</span><input type="color" data-prop="background" aria-label="Canvas color" value="${project.background === "none" ? "#f4ecd9" : project.background}"><button data-action="transparent-canvas">${project.background === "none" ? "Use paper" : "Transparent"}</button></div><label class="field">Content source policy<select data-prop="contentType" aria-label="Content source policy"><option value="TECHNICAL_DEMO" ${project.contentType === "TECHNICAL_DEMO" ? "selected" : ""}>Nonmedical technical demo</option><option value="USER_SOURCE" ${project.contentType === "USER_SOURCE" ? "selected" : ""}>Learner-supplied source</option><option value="EXTERNAL_REVIEW" ${project.contentType === "EXTERNAL_REVIEW" ? "selected" : ""}>External-source review draft</option></select></label></section><section class="inspector-section"><h3>Narration</h3><label class="field">${mode === "story" ? "Story" : "Explanation"} duration (seconds)<input data-prop="duration" aria-label="Track duration seconds" type="number" min="1" max="240" step=".001" value="${currentTrack().durationMs / 1000}" ${currentTrack().audioAssetId ? "disabled" : ""}></label><p class="hint">Attach the real CPU-generated WAV when available. Until then, Play runs a silent motion preview.</p><div class="small-actions"><button data-action="import-audio">Attach WAV</button><button data-action="add-cue">Add caption cue</button></div></section><section class="inspector-section"><h3>Authoring workflow</h3><p class="hint">1. Import or draw the scene.<br>2. Connect objects to source facts.<br>3. Add both narration tracks and cues.<br>4. Preview, inspect and export.</p><div class="small-actions"><button data-action="readiness">Check readiness</button><button data-action="prompts">Export layer prompts</button></div></section>`;
    return;
  }
  const b = selectionBounds(nodes),
    r = n ? (Math.atan2(n.matrix[1], n.matrix[0]) * 180) / Math.PI : 0,
    disabled = preview || nodes.some((n) => n.locked) ? "disabled" : "";
  el.innerHTML = `<fieldset style="border:0;padding:0;margin:0" ${disabled}><section class="inspector-section"><h3>${n ? "Object" : "Selection"} <small>${n?.locked ? "Locked" : preview ? "Preview mode" : ""}</small></h3>${n ? `<label class="field">Layer name<input data-prop="name" aria-label="Layer name" value="${esc(n.name)}" maxlength="200"></label>${!scope.length ? `<label class="field">Layer role<select data-prop="role" aria-label="Layer role"><option value="element" ${n.role === "element" ? "selected" : ""}>Independent element</option><option value="background" ${n.role === "background" ? "selected" : ""}>Background</option></select></label>` : ""}` : ""}<div class="field-grid">${field("X", "x", round(b.x), 'type="number" step="1"')}${field("Y", "y", round(b.y), 'type="number" step="1"')}${field("Width", "width", round(b.width), 'type="number" min="1" step="1"')}${field("Height", "height", round(b.height), 'type="number" min="1" step="1"')}${field("Rotation", "rotation", round(r), 'type="number" step="1"')}${field("Opacity %", "opacity", n ? round(n.opacity * 100) : 100, 'type="number" min="0" max="100"')}</div><div class="align-row"><button data-action="align-left" title="Align left">⇤</button><button data-action="align-center" title="Align horizontal centers">↔</button><button data-action="align-top" title="Align top">⇡</button><button data-action="flip" title="Flip horizontally">⇆</button></div></section>
    ${n && n.type !== "group" && n.type !== "image" ? `<section class="inspector-section"><h3>Appearance</h3><div class="color-row"><span>Fill</span><input data-prop="fill" type="color" aria-label="Fill color" value="${n.fill === "none" ? "#e7b45d" : n.fill}"><button data-action="no-fill">${n.fill === "none" ? "Add fill" : "No fill"}</button></div><div class="color-row"><span>Stroke</span><input data-prop="stroke" type="color" aria-label="Stroke color" value="${n.stroke === "none" ? "#233832" : n.stroke}"><button data-action="no-stroke">${n.stroke === "none" ? "Add stroke" : "No stroke"}</button></div><label class="field">Stroke width<input data-prop="strokeWidth" aria-label="Stroke width" type="number" min="0" max="200" value="${n.strokeWidth}"></label>${n.type === "rect" ? `<label class="field">Corner radius<input data-prop="radius" type="number" aria-label="Corner radius" min="0" max="32768" value="${n.radius}"></label>` : ""}</section>` : ""}
    ${n?.type === "text" ? `<section class="inspector-section"><h3>Typography</h3><textarea data-prop="text" aria-label="Label text">${esc(n.text)}</textarea><div class="field-grid">${field("Font size", "fontSize", n.fontSize, 'type="number" min="4" max="600"')}<label>Font<select data-prop="fontFamily"><option ${n.fontFamily === "sans-serif" ? "selected" : ""}>sans-serif</option><option ${n.fontFamily === "serif" ? "selected" : ""}>serif</option><option ${n.fontFamily === "monospace" ? "selected" : ""}>monospace</option></select></label></div><label class="field">Weight<select data-prop="fontWeight"><option value="400" ${n.fontWeight === "400" ? "selected" : ""}>Regular</option><option value="600" ${n.fontWeight === "600" ? "selected" : ""}>Semibold</option><option value="700" ${n.fontWeight === "700" ? "selected" : ""}>Bold</option></select></label></section>` : ""}
    ${n?.type === "path" ? `<section class="inspector-section"><h3>Path <small>${n.points.length} anchors</small></h3><label class="check-row"><input data-prop="closed" type="checkbox" ${n.closed ? "checked" : ""}> Close path</label><div class="small-actions"><button data-action="edit-nodes">Edit nodes</button><button data-action="add-node">Add midpoint</button><button data-action="remove-node">Remove active node</button></div><p class="hint">Drag anchors and handles with A. Hold Shift while dragging a handle to mirror its partner.</p></section>` : ""}
    ${n ? `<section class="inspector-section"><h3>Connected facts <small>${n.factIds.length}</small></h3>${project.facts.map((f) => `<label class="fact-check"><input type="checkbox" data-fact-link="${f.id}" ${n.factIds.includes(f.id) ? "checked" : ""}><span>${esc(f.text)}</span></label>`).join("") || '<p class="hint">Add a fact in the Facts panel.</p>'}</section><section class="inspector-section"><h3>Object motion <small>${mode}</small></h3><div class="field-grid">${field("Motion X", "motionDx", 0, 'type="number" id="motion-dx"')}${field("Motion Y", "motionDy", 0, 'type="number" id="motion-dy"')}${field("Motion scale", "motionScale", 1, 'type="number" step=".005" min=".1" max="10" id="motion-scale"')}${field("Motion rotation", "motionRotation", 0, 'type="number" id="motion-rotation"')}</div><div class="small-actions"><button data-action="keyframe">◆ Key at ${fmt(time)}</button><button data-action="gentle-motion">Gentle zoom</button><button data-action="clear-motion">Clear</button></div><p class="hint">${n.motion[mode].length} keyframes. Use Preview lesson to see motion. Values are offsets from the base artwork.</p></section>` : ""}
    </fieldset><section class="inspector-section"><div class="small-actions">${n?.type === "group" ? '<button data-action="enter-group">Edit group contents</button>' : ""}<button data-action="export-selection">Export selection PNG</button><button data-action="delete" class="danger">Delete layer</button></div></section>`;
  if (n) {
    const k = motionAt(n.motion[mode], time);
    $("#motion-dx").value = round(k.dx);
    $("#motion-dy").value = round(k.dy);
    $("#motion-scale").value = round(k.scale, 4);
    $("#motion-rotation").value = round(k.rotation);
  }
}
function drawTimeline() {
  for (const b of $$("[data-track]"))
    b.classList.toggle("active", b.dataset.track === mode);
  $("#track-name").textContent = mode.toUpperCase();
  const t = currentTrack();
  $("#playhead").max = t.durationMs;
  $("#time-ruler").innerHTML = Array.from(
    { length: 7 },
    (_, i) => `<span>${fmt((t.durationMs * i) / 6)}</span>`,
  ).join("");
  $("#cue-lane").innerHTML = t.cues
    .map(
      (c) =>
        `<button class="cue-block" data-cue="${c.id}" style="left:${(c.startMs / t.durationMs) * 100}%;width:${((c.endMs - c.startMs) / t.durationMs) * 100}%" title="Edit ${esc(c.text)}">${esc(c.text || "Untitled cue")}</button>`,
    )
    .join("");
  const asset = t.audioAssetId ? project.assets[t.audioAssetId] : null;
  $("#waveform").innerHTML = asset
    ? asset.waveform
        .map((v) => `<i style="height:${Math.max(2, v * 22)}px"></i>`)
        .join("")
    : "<span>NO AUDIO ATTACHED · TIMING IS A DRAFT</span>";
  $("#audio-status").textContent = asset
    ? "Local WAV · origin unverified"
    : "Silent motion preview";
  $("#remove-audio").hidden = !asset;
  updateTime();
}
function updateTime() {
  $("#playhead").value = time;
  $("#playhead-line").style.left =
    `${(time / currentTrack().durationMs) * 100}%`;
  $("#time-code").textContent =
    `${fmt(time)} / ${fmt(currentTrack().durationMs)}`;
  $("#play").textContent = playing ? "Ⅱ" : "▶";
  $("#play").setAttribute(
    "aria-label",
    playing ? "Pause preview" : "Play preview",
  );
  for (const b of $$("[data-cue]"))
    b.classList.toggle(
      "active",
      currentTrack().cues.some(
        (c) => c.id === b.dataset.cue && time >= c.startMs && time < c.endMs,
      ),
    );
}

function pause() {
  playing = false;
  audio.pause();
  cancelAnimationFrame(raf);
  raf = null;
  updateTime();
}
function syncAudio() {
  const id = currentTrack().audioAssetId,
    key = id ? `${project.id}/${mode}/${id}` : "";
  desiredSeek = time / 1000;
  if (key === audioKey) {
    if (id && audio.readyState >= 1) audio.currentTime = desiredSeek;
    return;
  }
  audio.pause();
  audioKey = key;
  audioEpoch++;
  audio.removeAttribute("src");
  audio.load();
  if (id) {
    audio.src = project.assets[id].data;
    audio.playbackRate = speed;
    audio.load();
  }
}
audio.addEventListener("loadedmetadata", () => {
  if (audioKey && audio.readyState >= 1)
    audio.currentTime = clamp(desiredSeek, 0, audio.duration);
});
audio.addEventListener("error", () => {
  if (audioKey) {
    pause();
    toast(
      "The attached WAV could not be played. The scene is still saved.",
      true,
    );
  }
});
audio.addEventListener("ended", () => {
  time = currentTrack().durationMs;
  pause();
  drawScene();
});
audio.addEventListener("seeked", () => {
  if (audioKey) {
    time = clamp(
      Math.round(audio.currentTime * 1000),
      0,
      currentTrack().durationMs,
    );
    drawScene();
  }
});
async function play() {
  if (playing) {
    pause();
    return;
  }
  if (pathDraft) finishPath(false);
  preview = true;
  scope = [];
  if (time >= currentTrack().durationMs) time = 0;
  syncAudio();
  const epoch = audioEpoch;
  try {
    if (currentTrack().audioAssetId) {
      audio.playbackRate = speed;
      if (audio.readyState >= 1) audio.currentTime = time / 1000;
      desiredSeek = time / 1000;
      await audio.play();
      if (epoch !== audioEpoch) return;
    } else {
      silentOrigin = performance.now();
      silentStart = time;
    }
    playing = true;
    draw();
    raf = requestAnimationFrame(tick);
  } catch (error) {
    pause();
    toast(`Playback could not start: ${error.message}`, true);
  }
}
function tick(now) {
  if (!playing) return;
  time = currentTrack().audioAssetId
    ? Math.round(audio.currentTime * 1000)
    : Math.min(
        currentTrack().durationMs,
        silentStart + (now - silentOrigin) * speed,
      );
  drawScene();
  if (time >= currentTrack().durationMs) {
    pause();
    return;
  }
  raf = requestAnimationFrame(tick);
}
function seek(ms) {
  time = clamp(Math.floor(ms), 0, currentTrack().durationMs);
  desiredSeek = time / 1000;
  if (currentTrack().audioAssetId && audio.readyState >= 1)
    audio.currentTime = desiredSeek;
  silentStart = time;
  silentOrigin = performance.now();
  drawScene();
}
function changeMode(next) {
  if (next === mode) return;
  const to = switchPosition(currentTrack(), project.tracks[next], time);
  pause();
  mode = next;
  time = to;
  syncAudio();
  draw();
}
document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    pause();
    autosave.flush();
  }
});

function showDialog(title, body, buttons, submit) {
  pause();
  modalSubmit = submit;
  $("#dialog-heading").textContent = title;
  $("#dialog-body").innerHTML = body;
  $("#dialog-actions").innerHTML = buttons
    .map(
      (b) =>
        `<button value="${b.value}" ${["cancel", "delete"].includes(b.value) ? "formnovalidate" : ""} class="${b.primary ? "primary" : ""} ${b.danger ? "danger" : ""}">${esc(b.label)}</button>`,
    )
    .join("");
  $("#dialog").showModal();
}
$("#dialog-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const action = event.submitter?.value || "save";
  if (action === "cancel") {
    $("#dialog").close();
    return;
  }
  try {
    await modalSubmit?.(action, new FormData($("#dialog-form")));
    $("#dialog").close();
  } catch (error) {
    let el = $("#dialog-error");
    if (!el) {
      el = document.createElement("p");
      el.id = "dialog-error";
      el.style.color = "var(--danger)";
      $("#dialog-body").append(el);
    }
    el.textContent = error.message;
  }
});
function confirmReplace(next) {
  showDialog(
    "Start a different scene?",
    `<p>Your current scene has local recovery. Save a project file first if you want to keep it as a separate document.</p>`,
    [
      { value: "cancel", label: "Keep editing" },
      { value: "replace", label: "Start scene", primary: true },
    ],
    () => installProject(next),
  );
}
async function installProject(next) {
  validateProject(next);
  await verifyAssets(next);
  pause();
  project = next;
  documentEpoch++;
  history.clear();
  scope = [];
  selection.clear();
  pathDraft = null;
  gesture = null;
  time = 0;
  preview = false;
  mode = "explanation";
  syncAudio();
  markChanged();
  draw();
  requestAnimationFrame(fit);
}
function sourceDialog(source = null) {
  const initial = source
    ? Object.entries(source.excerpts)[0]
    : ["passage 1", ""];
  showDialog(
    source ? "Edit source" : "Add a source excerpt",
    `<label class="dialog-label">Source title</label><input name="title" required maxlength="500" value="${esc(source?.title || "")}"><label class="dialog-label">Source file SHA-256 (from extraction; leave blank if unknown)</label><input name="sha256" pattern="[a-f0-9]{64}|^$" value="${source?.sha256 || ""}"><label class="dialog-label">Locator</label><input name="locator" required maxlength="500" value="${esc(initial[0])}"><label class="dialog-label">Exact excerpt</label><textarea name="excerpt" required rows="7">${esc(initial[1])}</textarea><label class="check-row"><input name="userProvided" type="checkbox" ${source?.userProvided ? "checked" : ""}> This source was supplied by the learner</label>${source && Object.keys(source.excerpts).length > 1 ? "<p>Other imported excerpts are preserved. This form edits the first excerpt only.</p>" : ""}`,
    [
      { value: "cancel", label: "Cancel" },
      { value: "save", label: "Save source", primary: true },
    ],
    (_, form) => {
      const locator = form.get("locator").trim(),
        excerpt = form.get("excerpt");
      if (!locator || !excerpt.trim())
        throw new Error("Enter a locator and the exact excerpt.");
      commit("Edit source", () => {
        const next = {
          id: source?.id || uid("source"),
          title: form.get("title").trim(),
          sha256: form.get("sha256").trim(),
          userProvided: form.has("userProvided"),
          excerpts: { ...(source?.excerpts || {}), [locator]: excerpt },
        };
        if (source) {
          const i = project.sources.findIndex((s) => s.id === source.id);
          project.sources[i] = next;
        } else project.sources.push(next);
      });
    },
  );
}
function factDialog(fact = null) {
  if (!project.sources.length) {
    sourceDialog();
    toast("Add a source excerpt before creating a fact.");
    return;
  }
  const refs = project.sources.flatMap((s) =>
      Object.entries(s.excerpts).map(([locator, excerpt]) => ({
        sourceId: s.id,
        title: s.title,
        locator,
        excerpt,
      })),
    ),
    old = fact?.sources[0],
    index = refs.findIndex(
      (r) => r.sourceId === old?.sourceId && r.locator === old?.locator,
    );
  showDialog(
    fact ? "Edit a source-linked fact" : "Add a source-linked fact",
    `<label class="dialog-label">Complete fact statement</label><textarea name="text" required rows="4">${esc(fact?.text || "")}</textarea><label class="dialog-label">Source location</label><select name="reference" id="fact-reference">${refs.map((r, i) => `<option value="${i}" ${i === Math.max(0, index) ? "selected" : ""}>${esc(r.title + " · " + r.locator)}</option>`).join("")}</select><label class="dialog-label">Exact quote supporting this fact</label><textarea name="quote" required rows="3">${esc(old?.quote || "")}</textarea><label class="dialog-label">Source excerpt</label><textarea id="reference-preview" readonly rows="4">${esc(refs[Math.max(0, index)].excerpt)}</textarea>${fact && fact.sources.length > 1 ? "<p>Additional source references are preserved.</p>" : ""}`,
    [
      ...(fact
        ? [{ value: "delete", label: "Delete fact", danger: true }]
        : []),
      { value: "cancel", label: "Cancel" },
      { value: "save", label: "Save fact", primary: true },
    ],
    (action, form) => {
      if (action === "delete") {
        commit("Delete fact", () => {
          project.facts = project.facts.filter((f) => f.id !== fact.id);
          for (const n of flatten(project.nodes))
            n.factIds = n.factIds.filter((id) => id !== fact.id);
          for (const t of Object.values(project.tracks))
            for (const c of t.cues)
              c.factIds = c.factIds.filter((id) => id !== fact.id);
        });
        return;
      }
      const r = refs[Number(form.get("reference"))],
        quote = form.get("quote");
      if (!quote.trim() || !r.excerpt.includes(quote))
        throw new Error(
          "The quote must be an exact substring of the selected excerpt.",
        );
      commit("Edit fact", () => {
        const next = {
          id: fact?.id || uid("fact"),
          text: form.get("text").trim(),
          sources: [
            { sourceId: r.sourceId, locator: r.locator, quote },
            ...(fact?.sources.slice(1) || []),
          ],
        };
        if (fact)
          project.facts[project.facts.findIndex((f) => f.id === fact.id)] =
            next;
        else project.facts.push(next);
      });
    },
  );
  $("#fact-reference").addEventListener(
    "change",
    (e) =>
      ($("#reference-preview").value = refs[Number(e.target.value)].excerpt),
  );
}
function cueDialog(cue = null) {
  const t = currentTrack();
  let start = time,
    end = Math.min(t.durationMs, time + 10000);
  if (!cue) {
    const gaps = [];
    let last = 0;
    for (const c of t.cues) {
      if (c.startMs > last) gaps.push([last, c.startMs]);
      last = c.endMs;
    }
    if (last < t.durationMs) gaps.push([last, t.durationMs]);
    const gap = gaps.find((g) => g[1] > time) || gaps[0];
    if (!gap) {
      toast(
        "This track is fully covered. Click an existing cue to edit its timing.",
      );
      return;
    }
    start = Math.max(gap[0], Math.min(time, gap[1] - 1000));
    end = Math.min(gap[1], start + 10000);
  }
  const nodes = flatten(project.nodes);
  let camera = cue?.camera ?? { x: 0, y: 0, width: 1, height: 1 };
  const allBoxes = visibleWorldBoxes(),
    boxes = [...selection].map((id) => allBoxes.get(id)).filter(Boolean);
  const focused = boxes.length
    ? fitRegion(union(boxes), project.width, project.height)
    : null;
  showDialog(
    cue ? "Edit narration cue" : "Add narration cue",
    `<div class="field-grid"><label>Start (seconds)<input name="start" type="number" min="0" max="240" step=".001" value="${(cue?.startMs ?? start) / 1000}" required></label><label>End (seconds)<input name="end" type="number" min=".001" max="240" step=".001" value="${(cue?.endMs ?? end) / 1000}" required></label></div><label class="dialog-label">Narration / caption text</label><textarea name="text" rows="4" required>${esc(cue?.text || "")}</textarea><label class="dialog-label">Facts (Ctrl/Cmd click for multiple)</label><select name="facts" multiple size="3">${project.facts.map((f) => `<option value="${f.id}" ${cue?.factIds.includes(f.id) ? "selected" : ""}>${esc(f.text)}</option>`).join("")}</select><label class="dialog-label">Highlighted objects</label><select name="layers" multiple size="3">${nodes.map((n) => `<option value="${n.id}" ${(cue ? cue.layerIds.includes(n.id) : selection.has(n.id)) ? "selected" : ""}>${esc(n.name)}</option>`).join("")}</select><div class="small-actions"><button type="button" id="cue-focus" ${focused ? "" : "disabled"}>Focus selected objects</button><button type="button" id="cue-full">Full scene</button></div><p class="hint" id="cue-camera"></p><label class="dialog-label">Camera easing</label><select name="easing"><option value="EASE_IN_OUT" ${cue?.easing !== "LINEAR" ? "selected" : ""}>Gentle ease in / out</option><option value="LINEAR" ${cue?.easing === "LINEAR" ? "selected" : ""}>Linear</option></select>`,
    [
      ...(cue ? [{ value: "delete", label: "Delete cue", danger: true }] : []),
      { value: "cancel", label: "Cancel" },
      { value: "save", label: "Save cue", primary: true },
    ],
    (action, form) => {
      if (action === "delete") {
        commit(
          "Delete cue",
          () => (t.cues = t.cues.filter((c) => c.id !== cue.id)),
        );
        return;
      }
      const next = {
        id: cue?.id || uid("cue"),
        startMs: Math.round(Number(form.get("start")) * 1000),
        endMs: Math.round(Number(form.get("end")) * 1000),
        text: form.get("text").trim(),
        factIds: form.getAll("facts"),
        layerIds: form.getAll("layers"),
        camera,
        easing: form.get("easing"),
      };
      const proposed = snapshot(project);
      proposed.tracks[mode].cues = proposed.tracks[mode].cues
        .filter((c) => c.id !== next.id)
        .concat(next)
        .sort((a, b) => a.startMs - b.startMs);
      validateProject(proposed);
      commit(
        "Edit cue",
        () => (project.tracks[mode].cues = proposed.tracks[mode].cues),
      );
    },
  );
  const showCamera = () =>
    ($("#cue-camera").textContent =
      `Focus: x ${round(camera.x, 2)}, y ${round(camera.y, 2)}, width ${round(camera.width, 2)}, height ${round(camera.height, 2)}`);
  $("#cue-focus").onclick = () => {
    camera = focused;
    showCamera();
  };
  $("#cue-full").onclick = () => {
    camera = { x: 0, y: 0, width: 1, height: 1 };
    showCamera();
  };
  showCamera();
}

function hitNode(target) {
  let el = target.closest("[data-node]");
  const nodes = currentNodes();
  while (el && !nodes.some((n) => n.id === el.dataset.node))
    el = el.parentElement?.closest("[data-node]");
  return el ? nodes.find((n) => n.id === el.dataset.node) : null;
}
function startGesture(event, data) {
  gesture = { ...data, pointerId: event.pointerId };
  stage.setPointerCapture(event.pointerId);
}
function cancelGesture() {
  if (gesture?.before) {
    project = gesture.before;
    tidySelection();
  }
  gesture = null;
  pathDraft = null;
  draw();
}
stage.addEventListener("pointerdown", (event) => {
  if (event.button !== 0 && event.button !== 1) return;
  stage.focus({ preventScroll: true });
  event.preventDefault();
  if (tool === "hand" || spaceDown || event.button === 1) {
    startGesture(event, {
      type: "pan",
      clientX: event.clientX,
      clientY: event.clientY,
      left: scroll.scrollLeft,
      top: scroll.scrollTop,
    });
    return;
  }
  if (preview) return;
  const pos = snapped(parentPoint(event)),
    handle = event.target.dataset.handle,
    pointIndex = event.target.dataset.point;
  if (handle && editable().length) {
    const b = selectionBounds(editable());
    startGesture(event, {
      type: handle === "rotate" ? "rotate" : "resize",
      handle,
      start: pos,
      box: b,
      before: snapshot(project),
      originals: editable().map((n) => ({ id: n.id, matrix: [...n.matrix] })),
      changed: false,
    });
    return;
  }
  if (
    pointIndex !== undefined &&
    selected()[0]?.type === "path" &&
    !selected()[0].locked
  ) {
    const n = selected()[0];
    activePoint = Number(pointIndex);
    startGesture(event, {
      type: "point",
      id: n.id,
      index: activePoint,
      side: event.target.dataset.side,
      before: snapshot(project),
      original: clone(n.points[activePoint]),
      start: point(inverse(n.matrix), pos),
      changed: false,
    });
    return;
  }
  if (tool === "select" || tool === "nodes") {
    const n = hitNode(event.target);
    if (n) {
      if (event.shiftKey) {
        if (selection.has(n.id)) {
          selection.delete(n.id);
          draw();
          return;
        }
        selection.add(n.id);
      } else if (!selection.has(n.id)) selection = new Set([n.id]);
      draw();
      if (!n.locked && editable().length)
        startGesture(event, {
          type: "move",
          start: pos,
          clientX: event.clientX,
          clientY: event.clientY,
          before: snapshot(project),
          originals: editable().map((v) => ({
            id: v.id,
            matrix: [...v.matrix],
          })),
          changed: false,
        });
    } else {
      if (!event.shiftKey) selection.clear();
      startGesture(event, {
        type: "marquee",
        start: pos,
        current: pos,
        prior: [...selection],
      });
      draw();
    }
    return;
  }
  if (tool === "text") {
    showDialog(
      "Add a text label",
      '<label class="dialog-label">Text</label><textarea name="text" required rows="3">A memorable idea</textarea>',
      [
        { value: "cancel", label: "Cancel" },
        { value: "save", label: "Add text", primary: true },
      ],
      (_, form) =>
        commit("Add text", () => {
          const value = form.get("text"),
            n = makeNode("text", {
              text: value,
              matrix: translate(pos.x, pos.y),
              width: Math.max(
                20,
                Math.max(...value.split("\n").map((l) => l.length)) * 29,
              ),
              height: Math.max(60, value.split("\n").length * 58),
              fill: "#263b37",
            });
          currentNodes().push(n);
          selection = new Set([n.id]);
          tool = "select";
        }),
    );
    return;
  }
  if (tool === "pen") {
    if (!pathDraft) pathDraft = { points: [], scope: [...scope] };
    const first = pathDraft.points[0];
    if (
      first &&
      pathDraft.points.length >= 3 &&
      Math.hypot(first.x - pos.x, first.y - pos.y) < 12 / zoom
    ) {
      finishPath(true);
      return;
    }
    const last = pathDraft.points.at(-1);
    if (
      event.detail > 1 &&
      last &&
      Math.hypot(last.x - pos.x, last.y - pos.y) < 5 / zoom
    )
      return;
    pathDraft.points.push({ ...pos });
    startGesture(event, {
      type: "pen",
      index: pathDraft.points.length - 1,
      start: pos,
    });
    drawDraft();
    return;
  }
  const before = snapshot(project),
    type = tool === "freehand" ? "path" : tool,
    n = makeNode(type, {
      matrix: translate(pos.x, pos.y),
      width: 1,
      height: 1,
      ...(type === "path"
        ? { points: [{ x: 0, y: 0 }], fill: "none", strokeWidth: 4 }
        : {}),
      ...(type === "ellipse" ? { fill: "#93b59b" } : {}),
    });
  currentNodes().push(n);
  selection = new Set([n.id]);
  startGesture(event, {
    type: "draw",
    id: n.id,
    drawTool: tool,
    start: pos,
    before,
    changed: false,
  });
  drawScene();
});
stage.addEventListener("pointermove", (event) => {
  if (!gesture || event.pointerId !== gesture.pointerId) return;
  const g = gesture;
  if (g.type === "pan") {
    scroll.scrollLeft = g.left - (event.clientX - g.clientX);
    scroll.scrollTop = g.top - (event.clientY - g.clientY);
    return;
  }
  const pos = snapped(parentPoint(event));
  if (g.type === "move") {
    if (
      !g.changed &&
      Math.hypot(event.clientX - g.clientX, event.clientY - g.clientY) < 3
    )
      return;
    g.changed = true;
    let dx = pos.x - g.start.x,
      dy = pos.y - g.start.y;
    if (event.shiftKey) {
      if (Math.abs(dx) > Math.abs(dy)) dy = 0;
      else dx = 0;
    }
    for (const item of g.originals)
      findNode(project, item.id).matrix = multiply(
        translate(dx, dy),
        item.matrix,
      );
  } else if (g.type === "resize") {
    const b = g.box,
      anchor = {
        x: g.handle.includes("w") ? b.x + b.width : b.x,
        y: g.handle.includes("n") ? b.y + b.height : b.y,
      };
    let sx =
        (pos.x - anchor.x) /
        (g.handle.includes("w") ? -Math.max(1, b.width) : Math.max(1, b.width)),
      sy =
        (pos.y - anchor.y) /
        (g.handle.includes("n")
          ? -Math.max(1, b.height)
          : Math.max(1, b.height));
    sx = clamp(sx, 0.01, 100);
    sy = clamp(sy, 0.01, 100);
    if (event.shiftKey) sx = sy = Math.max(sx, sy);
    const m = around(anchor.x, anchor.y, scale(sx, sy));
    for (const item of g.originals)
      findNode(project, item.id).matrix = multiply(m, item.matrix);
    g.changed = true;
  } else if (g.type === "rotate") {
    const cx = g.box.x + g.box.width / 2,
      cy = g.box.y + g.box.height / 2;
    let degrees =
      ((Math.atan2(pos.y - cy, pos.x - cx) -
        Math.atan2(g.start.y - cy, g.start.x - cx)) *
        180) /
      Math.PI;
    if (event.shiftKey) degrees = Math.round(degrees / 15) * 15;
    const m = around(cx, cy, rotate(degrees));
    for (const item of g.originals)
      findNode(project, item.id).matrix = multiply(m, item.matrix);
    g.changed = true;
  } else if (g.type === "draw") {
    const n = findNode(project, g.id);
    if (g.drawTool === "freehand") {
      const p = point(inverse(n.matrix), pos),
        last = n.points.at(-1);
      if (
        n.points.length < 4000 &&
        Math.hypot(p.x - last.x, p.y - last.y) > 3 / zoom
      )
        n.points.push(p);
    } else {
      let dx = pos.x - g.start.x,
        dy = pos.y - g.start.y;
      if (event.shiftKey) {
        const s = Math.max(Math.abs(dx), Math.abs(dy));
        dx = Math.sign(dx || 1) * s;
        dy = Math.sign(dy || 1) * s;
      }
      n.matrix = translate(
        Math.min(g.start.x, g.start.x + dx),
        Math.min(g.start.y, g.start.y + dy),
      );
      n.width = Math.max(1, Math.abs(dx));
      n.height = Math.max(1, Math.abs(dy));
    }
    g.changed = true;
  } else if (g.type === "point") {
    const n = findNode(project, g.id),
      p = point(inverse(n.matrix), pos),
      target = n.points[g.index];
    if (g.side === "anchor") {
      const dx = p.x - g.start.x,
        dy = p.y - g.start.y;
      target.x = g.original.x + dx;
      target.y = g.original.y + dy;
      for (const side of ["in", "out"])
        if (g.original[side])
          target[side] = {
            x: g.original[side].x + dx,
            y: g.original[side].y + dy,
          };
    } else {
      target[g.side] = p;
      if (event.shiftKey)
        target[g.side === "in" ? "out" : "in"] = {
          x: 2 * target.x - p.x,
          y: 2 * target.y - p.y,
        };
    }
    g.changed = true;
  } else if (g.type === "pen") {
    const pt = pathDraft.points[g.index];
    if (Math.hypot(pos.x - pt.x, pos.y - pt.y) > 3 / zoom) {
      pt.out = { ...pos };
      pt.in = { x: 2 * pt.x - pos.x, y: 2 * pt.y - pos.y };
    }
    drawDraft();
    return;
  } else if (g.type === "marquee") {
    g.current = pos;
    const b = {
      x: Math.min(pos.x, g.start.x),
      y: Math.min(pos.y, g.start.y),
      width: Math.abs(pos.x - g.start.x),
      height: Math.abs(pos.y - g.start.y),
    };
    selection = new Set([
      ...g.prior,
      ...currentNodes()
        .filter(
          (n) =>
            n.visible &&
            !n.locked &&
            (() => {
              const v = bounds(n);
              return (
                v.x >= b.x &&
                v.y >= b.y &&
                v.x + v.width <= b.x + b.width &&
                v.y + v.height <= b.y + b.height
              );
            })(),
        )
        .map((n) => n.id),
    ]);
    drawScene();
    $("#drawing-overlay").innerHTML =
      `<g transform="matrix(${scopeMatrix(project, scope).join(" ")})"><rect x="${b.x}" y="${b.y}" width="${b.width}" height="${b.height}" fill="#74b6aa22" stroke="#74b6aa" vector-effect="non-scaling-stroke"/></g>`;
    return;
  }
  drawScene();
});
stage.addEventListener("pointerup", (event) => {
  const g = gesture;
  if (!g || g.pointerId !== event.pointerId) return;
  gesture = null;
  try {
    stage.releasePointerCapture(event.pointerId);
  } catch {}
  if (g.type === "pen") {
    drawDraft();
    return;
  }
  if (g.type === "draw") {
    const n = findNode(project, g.id);
    if (n.type === "path" && n.points.length < 2) {
      project = g.before;
      selection.clear();
      draw();
      return;
    }
    if (n.type !== "path" && (n.width < 3 || n.height < 3)) {
      n.width = 180;
      n.height = g.drawTool === "ellipse" ? 180 : 140;
    }
    g.changed = true;
    tool = "select";
  }
  if (g.before && g.changed) {
    try {
      validateProject(project);
      history.record(
        g.before,
        {
          draw: "Draw object",
          move: "Move objects",
          resize: "Resize objects",
          rotate: "Rotate objects",
          point: "Edit path node",
        }[g.type] || "Edit scene",
      );
      markChanged();
    } catch (e) {
      project = g.before;
      tidySelection();
      toast(e.message, true);
    }
  }
  draw();
});
stage.addEventListener("pointercancel", () => {
  if (gesture) cancelGesture();
});
stage.addEventListener("dblclick", (event) => {
  if (preview) return;
  if (tool === "pen") {
    finishPath(false);
    return;
  }
  const n = hitNode(event.target);
  if (n?.type === "group" && !n.locked) {
    scope.push(n.id);
    selection.clear();
    draw();
  } else if (n?.type === "text") {
    selection = new Set([n.id]);
    draw();
    const el = $("[data-prop=text]");
    el?.focus();
    el?.select();
  }
});
function finishPath(closed) {
  if (!pathDraft) return;
  const points = pathDraft.points;
  pathDraft = null;
  gesture = null;
  if (points.length < 2) {
    drawDraft();
    return;
  }
  commit("Draw pen path", () => {
    const n = makeNode("path", {
      name: "Pen path",
      points,
      closed,
      fill: closed ? "#e7b45d" : "none",
    });
    currentNodes().push(n);
    selection = new Set([n.id]);
    tool = "select";
  });
}
scroll.addEventListener(
  "wheel",
  (event) => {
    if (event.ctrlKey || event.metaKey) {
      event.preventDefault();
      zoomBy(Math.exp(-event.deltaY * 0.003));
    }
  },
  { passive: false },
);

function changeProperty(prop, value) {
  if (prop.startsWith("motion")) return;
  if (preview) {
    toast("Switch to Design to change the artwork.");
    drawInspector();
    return;
  }
  commit("Change properties", () => {
    const nodes = editable(),
      n = nodes.length === 1 ? nodes[0] : null;
    if (prop === "canvasWidth" || prop === "canvasHeight") {
      project[prop === "canvasWidth" ? "width" : "height"] = Number(value);
      return;
    }
    if (prop === "background" || prop === "contentType") {
      project[prop] = value;
      return;
    }
    if (prop === "duration") {
      if (currentTrack().audioAssetId)
        throw new Error("Duration is measured from the attached WAV.");
      retimeTrack(project, mode, Math.round(Number(value) * 1000));
      time = Math.min(time, currentTrack().durationMs);
      return;
    }
    if (!nodes.length) return;
    const b = selectionBounds(nodes);
    let transform = null;
    if (prop === "x") transform = translate(Number(value) - b.x, 0);
    if (prop === "y") transform = translate(0, Number(value) - b.y);
    if (prop === "width")
      transform = around(
        b.x,
        b.y,
        scale(Number(value) / Math.max(0.001, b.width), 1),
      );
    if (prop === "height")
      transform = around(
        b.x,
        b.y,
        scale(1, Number(value) / Math.max(0.001, b.height)),
      );
    if (prop === "rotation") {
      const current = n
        ? (Math.atan2(n.matrix[1], n.matrix[0]) * 180) / Math.PI
        : 0;
      transform = around(
        b.x + b.width / 2,
        b.y + b.height / 2,
        rotate(Number(value) - current),
      );
    }
    if (transform) {
      nodes.forEach((v) => (v.matrix = multiply(transform, v.matrix)));
      return;
    }
    if (prop === "opacity") {
      nodes.forEach((v) => (v.opacity = Number(value) / 100));
      return;
    }
    if (!n) return;
    if (
      [
        "name",
        "role",
        "fill",
        "stroke",
        "fontFamily",
        "fontWeight",
        "text",
      ].includes(prop)
    )
      n[prop] = value;
    if (["fontSize", "strokeWidth", "radius"].includes(prop))
      n[prop] = Number(value);
    if (prop === "closed") n.closed = value;
    if (n.type === "text" && (prop === "text" || prop === "fontSize")) {
      n.width = Math.max(
        20,
        Math.max(...n.text.split("\n").map((l) => l.length)) *
          n.fontSize *
          0.65,
      );
      n.height = Math.max(
        n.fontSize * 1.3,
        n.text.split("\n").length * n.fontSize * 1.2,
      );
    }
  });
}
$("#inspector").addEventListener("change", (event) => {
  const el = event.target;
  if (el.dataset.factLink) {
    const n = selected()[0];
    if (n && !n.locked && !preview)
      commit(
        "Link fact",
        () =>
          (n.factIds = el.checked
            ? [...new Set([...n.factIds, el.dataset.factLink])]
            : n.factIds.filter((id) => id !== el.dataset.factLink)),
      );
    return;
  }
  if (el.dataset.prop)
    changeProperty(
      el.dataset.prop,
      el.type === "checkbox" ? el.checked : el.value,
    );
});
$("#project-title").addEventListener("change", (e) =>
  commit(
    "Rename scene",
    () => (project.title = e.target.value.trim() || "Untitled scene"),
  ),
);
$("#playhead").addEventListener("input", (event) => {
  preview = true;
  seek(Number(event.target.value));
  $("#design-mode").classList.remove("active");
  $("#preview-mode").classList.add("active");
});
$("#playhead").addEventListener("change", () => drawInspector());
$("#playback-speed").addEventListener("change", (e) => {
  if (playing && !currentTrack().audioAssetId) {
    silentStart = time;
    silentOrigin = performance.now();
  }
  speed = Number(e.target.value);
  audio.playbackRate = speed;
});
$("#reduced-motion").addEventListener("change", (e) => {
  reduced = e.target.checked;
  drawScene();
});
$("#left-content").addEventListener("keydown", (e) => {
  if (
    e.key === "Enter" &&
    e.target.matches("[data-layer],[data-edit-fact],[data-edit-source]")
  )
    e.target.click();
});

function align(action) {
  commit("Align objects", () => {
    const nodes = editable();
    if (!nodes.length) return;
    const all = selectionBounds(nodes),
      reference =
        nodes.length > 1
          ? all
          : scope.length
            ? localBounds(findNode(project, scope.at(-1)))
            : { x: 0, y: 0, width: project.width, height: project.height };
    for (const n of nodes) {
      const b = bounds(n);
      let dx = 0,
        dy = 0;
      if (action === "align-left") dx = reference.x - b.x;
      if (action === "align-center")
        dx = reference.x + reference.width / 2 - b.x - b.width / 2;
      if (action === "align-top") dy = reference.y - b.y;
      n.matrix = multiply(translate(dx, dy), n.matrix);
    }
  });
}
function removeActiveNode() {
  const n = selected()[0];
  if (
    n?.type !== "path" ||
    n.locked ||
    activePoint === null ||
    n.points.length <= 2
  ) {
    toast("Select an anchor with A. A path must keep at least two anchors.");
    return;
  }
  commit("Remove path node", () => {
    n.points.splice(activePoint, 1);
    activePoint = null;
  });
}
function addImageNode(assetId) {
  const a = project.assets[assetId],
    ratio = Math.min(
      (project.width * 0.55) / a.width,
      (project.height * 0.65) / a.height,
      1,
    );
  const n = makeNode("image", {
    name: a.name,
    assetId,
    width: a.width,
    height: a.height,
    matrix: multiply(
      translate(
        (project.width - a.width * ratio) / 2,
        (project.height - a.height * ratio) / 2,
      ),
      scale(ratio),
    ),
    fill: "none",
    stroke: "none",
  });
  project.nodes.push(n);
  scope = [];
  selection = new Set([n.id]);
  tool = "select";
  return n;
}
async function exportChoice(type) {
  if (type === "project") {
    download(
      projectBlob(project),
      `${filename(project.title)}.sketcy-studio.json`,
    );
    unsavedDownload = false;
    toast("Editable project downloaded. Keep this file to reopen the scene.");
  }
  if (type === "svg")
    download(svgBlob(project), `${filename(project.title)}.svg`);
  if (type === "png") {
    toast("Rendering the scene PNG…");
    download(await pngBlob(project), `${filename(project.title)}.png`);
    toast("Scene PNG exported without authoring overlays.");
  }
  if (type === "selection") {
    const nodes = selected();
    if (!nodes.length) throw new Error("Select an object or group first.");
    let source = project;
    if (scope.length) {
      source = snapshot(project);
      source.nodes = [
        makeNode("group", {
          matrix: scopeMatrix(project, scope),
          children: clone(nodes),
        }),
      ];
    } else source = { ...project, nodes };
    const box = selectionBox(source, source.nodes);
    if (box.width > 4096 || box.height > 4096)
      throw new Error(
        "Selection exceeds 4096 pixels. Reduce its size before exporting.",
      );
    download(
      await pngBlob(source, { nodes: source.nodes, box, background: false }),
      `${filename(nodes[0].name)}-transparent.png`,
    );
    toast("Selection exported on a transparent canvas.");
  }
  if (type === "handoff")
    download(
      new Blob([JSON.stringify(handoff(project), null, 2) + "\n"], {
        type: "application/json",
      }),
      `${filename(project.title)}.studio-handoff.json`,
    );
}
function exportDialog() {
  showDialog(
    "Export the scene",
    `<p>Keep the editable project for future changes. The production handoff connects this scene to the existing Breeze and lesson-packaging tools.</p><div class="export-grid"><button type="button" data-export="project" class="export-choice"><b>Editable project</b><span>Artwork, embedded assets, facts, both timelines and motion.</span></button><button type="button" data-export="svg" class="export-choice"><b>Vector scene · SVG</b><span>Visible base artwork, with embedded images and editable vectors.</span></button><button type="button" data-export="png" class="export-choice"><b>Scene image · PNG</b><span>Full-resolution base illustration for the Android v1 package.</span></button><button type="button" data-export="selection" class="export-choice"><b>Selection · transparent PNG</b><span>The selected objects, cropped with an alpha background.</span></button><button type="button" data-export="handoff" class="export-choice"><b>Production handoff</b><span>Source facts, symbols and separate narration scripts. A draft, not an Android ZIP.</span></button></div>`,
    [{ value: "cancel", label: "Close" }],
    null,
  );
}
function prompts() {
  const nodes = flatten(project.nodes).filter(
    (n) => n.type === "image" || n.factIds.length || n.type === "group",
  );
  const lines = [
    "SKETCY STUDIO — ORIGINAL LAYER PRODUCTION",
    "Scene: " + project.title,
    `Canvas: ${project.width} × ${project.height}`,
    "Use the approved full-scene composition as the visual reference for every asset. Match perspective, colors, outlines and lighting. Preserve all source qualifiers.",
    "BACKGROUND: Produce the setting only. Remove independently controlled foreground objects, reconstruct the surfaces behind them, and retain useful negative space. No duplicate characters or baked-in copies of moving objects.",
    "",
  ];
  for (const n of nodes)
    lines.push(
      `LAYER: ${n.name}`,
      `ID: ${n.id}`,
      `FACTS: ${
        n.factIds
          .map((id) => project.facts.find((f) => f.id === id)?.text)
          .filter(Boolean)
          .join(" | ") ||
        "Setting or composition element; do not invent a medical claim."
      }`,
      "Produce this object as a separate PNG with a genuine transparent background. Include its full silhouette, consistent contact shadow and hidden portions required for modest movement. Do not paint a checkerboard. Match the reference; do not redesign the object.",
      "",
    );
  lines.push(
    "QA: inspect actual alpha; recompose at full and phone size; verify overlap, exact counts/labels, connected parts and reduced motion. Record placement, z order and pivots. These prompts do not generate artwork by themselves.",
  );
  download(
    new Blob([lines.join("\n")], { type: "text/plain" }),
    `${filename(project.title)}-layer-prompts.txt`,
  );
}

async function act(action) {
  if (["new", "demo", "open"].includes(action) && pathDraft) finishPath(false);
  const edits = [
    "group",
    "ungroup",
    "duplicate",
    "raise",
    "lower",
    "delete",
    "no-fill",
    "no-stroke",
    "flip",
    "add-node",
    "remove-node",
    "keyframe",
    "gentle-motion",
    "clear-motion",
    "align-left",
    "align-center",
    "align-top",
  ];
  if (preview && edits.includes(action)) {
    toast("Switch to Design to edit objects.");
    return;
  }
  if (action === "new") return confirmReplace(emptyProject());
  if (action === "demo") return confirmReplace(demoProject());
  if (action === "open") return $("#project-file").click();
  if (action === "save") return exportChoice("project");
  if (action === "export") return exportDialog();
  if (action === "export-selection") return exportChoice("selection");
  if (action === "prompts") return prompts();
  if (action === "undo") return undo();
  if (action === "redo") return redo();
  if (action === "fit") return fit();
  if (action === "zoom-in") return zoomBy(1.2);
  if (action === "zoom-out") return zoomBy(1 / 1.2);
  if (action === "grid") {
    grid = !grid;
    return draw();
  }
  if (action === "snap") {
    snap = !snap;
    return draw();
  }
  if (action === "design") {
    pause();
    preview = false;
    return draw();
  }
  if (action === "preview") {
    pause();
    preview = true;
    scope = [];
    return draw();
  }
  if (action === "play") return play();
  if (action === "leave-group") {
    scope.pop();
    selection.clear();
    return draw();
  }
  if (action === "enter-group") {
    const n = selected()[0];
    if (n?.type === "group" && !n.locked) {
      scope.push(n.id);
      selection.clear();
      draw();
    }
    return;
  }
  if (action === "import-image") return $("#image-files").click();
  if (action === "import-audio") return $("#audio-file").click();
  if (action === "import-source") return $("#source-file").click();
  if (action === "remove-audio") {
    pause();
    commit("Detach audio", () => (currentTrack().audioAssetId = null));
    syncAudio();
    return;
  }
  if (action === "add-source") return sourceDialog();
  if (action === "add-fact") return factDialog();
  if (action === "add-cue") return cueDialog();
  if (action === "readiness")
    return showDialog(
      "Lesson production readiness",
      `<p>These checks identify missing authoring inputs. They do not approve medical completeness or listening quality.</p><ul class="issue-list">${readiness(
        project,
      )
        .map((i) => `<li>${esc(i)}</li>`)
        .join("")}</ul>`,
      [{ value: "cancel", label: "Close" }],
      null,
    );
  if (action === "help")
    return showDialog(
      "A few useful shortcuts",
      `<div class="shortcut-grid">${[
        ["Select", "V"],
        ["Path nodes", "A"],
        ["Pan", "H / Space"],
        ["Pen / Bézier", "P"],
        ["Freehand", "B"],
        ["Rectangle", "R"],
        ["Ellipse", "E"],
        ["Text", "T"],
        ["Undo", "Ctrl/⌘ Z"],
        ["Redo", "Ctrl/⌘ Shift Z"],
        ["Duplicate", "Ctrl/⌘ D"],
        ["Group", "Ctrl/⌘ G"],
        ["Ungroup", "Ctrl/⌘ Shift G"],
        ["Save project", "Ctrl/⌘ S"],
        ["Nudge", "Arrows"],
        ["Nudge 10 px", "Shift + arrows"],
      ]
        .map(([a, b]) => `<div><span>${a}</span><kbd>${b}</kbd></div>`)
        .join(
          "",
        )}</div><p>Pen: click anchors; drag to create Bézier handles. Enter or double-click finishes an open path; clicking the first anchor closes it. Shift constrains moves, resizing and rotation. Double-click a group to edit its contents.</p>`,
      [{ value: "cancel", label: "Close" }],
      null,
    );
  if (action === "group")
    return commit("Group objects", () => {
      const g = groupNodes(currentNodes(), [...selection]);
      selection = new Set([g.id]);
    });
  if (action === "ungroup")
    return commit("Ungroup objects", () => {
      const ids = [];
      for (const id of selection)
        ids.push(...ungroupNode(currentNodes(), id, project).map((n) => n.id));
      selection = new Set(ids);
    });
  if (action === "duplicate")
    return commit(
      "Duplicate objects",
      () =>
        (selection = new Set(
          duplicateNodes(currentNodes(), [...selection], project).map(
            (n) => n.id,
          ),
        )),
    );
  if (action === "delete")
    return commit("Delete objects", () => {
      removeNodes(currentNodes(), [...selection], project);
      selection.clear();
    });
  if (action === "raise" || action === "lower")
    return commit("Reorder layers", () => {
      const ordered =
        action === "raise" ? [...selected()].reverse() : selected();
      for (const n of ordered)
        moveLayer(currentNodes(), n.id, action === "raise" ? 1 : -1);
    });
  if (action.startsWith("align-")) return align(action);
  if (action === "flip")
    return commit("Flip objects", () => {
      const nodes = editable(),
        b = selectionBounds(nodes),
        m = around(b.x + b.width / 2, b.y + b.height / 2, scale(-1, 1));
      nodes.forEach((n) => (n.matrix = multiply(m, n.matrix)));
    });
  if (action === "transparent-canvas")
    return commit(
      "Change canvas background",
      () =>
        (project.background =
          project.background === "none" ? "#f4ecd9" : "none"),
    );
  const n = selected()[0];
  if (!n || n.locked) return;
  if (action === "no-fill" || action === "no-stroke")
    return commit("Change paint", () => {
      const key = action === "no-fill" ? "fill" : "stroke";
      n[key] =
        n[key] === "none" ? (key === "fill" ? "#e7b45d" : "#233832") : "none";
    });
  if (action === "edit-nodes") return changeTool("nodes");
  if (action === "remove-node") return removeActiveNode();
  if (action === "add-node" && n.type === "path")
    return commit("Add path anchor", () => {
      const i = activePoint ?? 0,
        a = n.points[i],
        b = n.points[(i + 1) % n.points.length];
      n.points.splice(i + 1, 0, { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });
      activePoint = i + 1;
      tool = "nodes";
    });
  if (action === "clear-motion")
    return commit("Clear object motion", () => (n.motion[mode] = []));
  if (action === "gentle-motion")
    return commit(
      "Add gentle zoom",
      () =>
        (n.motion[mode] = [
          { atMs: 0, dx: 0, dy: 0, scale: 1, rotation: 0 },
          {
            atMs: Math.floor(currentTrack().durationMs / 2),
            dx: 0,
            dy: 0,
            scale: 1.025,
            rotation: 0,
          },
          {
            atMs: currentTrack().durationMs,
            dx: 0,
            dy: 0,
            scale: 1,
            rotation: 0,
          },
        ]),
    );
  if (action === "keyframe") {
    const key = {
      atMs: Math.floor(time),
      dx: Number($("#motion-dx").value),
      dy: Number($("#motion-dy").value),
      scale: Number($("#motion-scale").value),
      rotation: Number($("#motion-rotation").value),
    };
    return commit("Set object keyframe", () => putKeyframe(n, mode, key));
  }
}
document.addEventListener("click", (event) => {
  const button = event.target.closest("button");
  const a = button?.dataset.action;
  if (a) {
    act(a).catch((e) => toast(e.message, true));
    return;
  }
  if (button?.dataset.export) {
    exportChoice(button.dataset.export).catch((e) => toast(e.message, true));
    return;
  }
  if (button?.dataset.tool) return changeTool(button.dataset.tool);
  if (button?.dataset.tab) {
    tab = button.dataset.tab;
    return drawLeft();
  }
  if (button?.dataset.track) return changeMode(button.dataset.track);
  if (button?.dataset.visible)
    return commit("Change visibility", () => {
      const n = findNode(project, button.dataset.visible);
      n.visible = !n.visible;
    });
  if (button?.dataset.lock)
    return commit("Change layer lock", () => {
      const n = findNode(project, button.dataset.lock);
      n.locked = !n.locked;
    });
  if (button?.dataset.placeAsset) {
    preview = false;
    return commit("Place image", () => addImageNode(button.dataset.placeAsset));
  }
  if (button?.dataset.cue) {
    const cue = currentTrack().cues.find((c) => c.id === button.dataset.cue);
    seek(cue.startMs);
    return cueDialog(cue);
  }
  const row = event.target.closest("[data-layer]");
  if (row) {
    if (event.shiftKey) {
      if (selection.has(row.dataset.layer)) selection.delete(row.dataset.layer);
      else selection.add(row.dataset.layer);
    } else selection = new Set([row.dataset.layer]);
    activePoint = null;
    return draw();
  }
  const fact = event.target.closest("[data-edit-fact]");
  if (fact)
    return factDialog(
      project.facts.find((f) => f.id === fact.dataset.editFact),
    );
  const source = event.target.closest("[data-edit-source]");
  if (source)
    return sourceDialog(
      project.sources.find((s) => s.id === source.dataset.editSource),
    );
});
$("#left-content").addEventListener("dblclick", (e) => {
  const row = e.target.closest("[data-layer]"),
    n = row ? findNode(project, row.dataset.layer) : null;
  if (n?.type === "group" && !n.locked && !preview) {
    scope.push(n.id);
    selection.clear();
    draw();
  }
});

$("#project-file").addEventListener("change", async (event) => {
  const file = event.target.files[0];
  event.target.value = "";
  if (!file) return;
  try {
    if (file.size > LIMITS.projectBytes)
      throw new Error("Project files must be at most 128 MiB.");
    const next = JSON.parse(await file.text());
    validateProject(next);
    await verifyAssets(next);
    showDialog(
      "Open saved project?",
      `<p>Open <strong>${esc(next.title)}</strong>? Save the current project first if you need a separate copy.</p>`,
      [
        { value: "cancel", label: "Keep editing" },
        { value: "open", label: "Open project", primary: true },
      ],
      () => installProject(next),
    );
  } catch (e) {
    toast(`Project was not opened: ${e.message}`, true);
  }
});
$("#image-files").addEventListener("change", async (event) => {
  const files = [...event.target.files];
  event.target.value = "";
  if (!files.length) return;
  const epoch = documentEpoch;
  try {
    if (files.length + Object.keys(project.assets).length > LIMITS.assets)
      throw new Error("A project can contain at most 100 media assets.");
    toast("Checking image dimensions and transparency…");
    const imported = [];
    for (const file of files) imported.push(await imageAsset(file));
    if (epoch !== documentEpoch)
      throw new Error("Scene changed during import; choose the images again.");
    preview = false;
    const committed = commit("Import artwork", () => {
      for (const { id, asset } of imported) {
        project.assets[id] = asset;
        addImageNode(id);
      }
      selection = new Set(
        project.nodes.slice(-imported.length).map((n) => n.id),
      );
    });
    if (!committed) return;
    toast(
      `Imported ${imported.length} image${imported.length === 1 ? "" : "s"} with original transparency preserved.`,
    );
  } catch (e) {
    toast(e.message, true);
  }
});
$("#audio-file").addEventListener("change", async (event) => {
  const file = event.target.files[0],
    targetMode = mode,
    epoch = documentEpoch;
  event.target.value = "";
  if (!file) return;
  try {
    const { id, asset } = await audioAsset(file);
    if (epoch !== documentEpoch)
      throw new Error("Scene changed during import; choose the WAV again.");
    pause();
    const committed = commit("Attach narration WAV", () => {
      project.assets[id] = asset;
      retimeTrack(project, targetMode, asset.durationMs);
      project.tracks[targetMode].audioAssetId = id;
      time = Math.min(time, currentTrack().durationMs);
    });
    if (!committed) return;
    syncAudio();
    toast(
      `WAV attached (${(asset.durationMs / 1000).toFixed(2)} s). Existing cues were rescaled as a draft; inspect them against the audio.`,
    );
  } catch (e) {
    toast(e.message, true);
  }
});
$("#source-file").addEventListener("change", async (event) => {
  const file = event.target.files[0],
    epoch = documentEpoch;
  event.target.value = "";
  if (!file) return;
  try {
    if (file.size > 4 * 1024 * 1024)
      throw new Error("Extracted source JSON must be at most 4 MiB.");
    const raw = JSON.parse(await file.text()),
      s = raw.source || raw;
    const source = {
      id: s.id,
      title: s.title,
      sha256: s.sha256,
      userProvided: s.userProvided,
      excerpts: s.excerpts,
    };
    if (epoch !== documentEpoch)
      throw new Error("Scene changed during import.");
    if (project.sources.some((v) => v.id === source.id))
      throw new Error(
        "This source ID already exists; existing references were preserved.",
      );
    const proposed = snapshot(project);
    proposed.sources.push(source);
    validateProject(proposed);
    commit("Import extracted source", () => project.sources.push(source));
    tab = "facts";
    drawLeft();
    toast(
      "Source excerpts imported. Review extraction before building the fact inventory.",
    );
  } catch (e) {
    toast(`Source was not imported: ${e.message}`, true);
  }
});
document.addEventListener("keydown", (event) => {
  const typing = event.target.matches(
    "input,textarea,select,[contenteditable]",
  );
  if ($("#dialog").open) return;
  const mod = event.ctrlKey || event.metaKey,
    key = event.key.toLowerCase();
  if (mod && key === "s") {
    event.preventDefault();
    exportChoice("project").catch((e) => toast(e.message, true));
    return;
  }
  if (typing) return;
  if (key === "escape") {
    if (gesture || pathDraft) cancelGesture();
    else {
      selection.clear();
      scope = [];
      draw();
    }
    return;
  }
  if (key === "enter" && pathDraft) {
    event.preventDefault();
    finishPath(false);
    return;
  }
  if (event.code === "Space") {
    event.preventDefault();
    spaceDown = true;
    return;
  }
  if (mod && key === "z") {
    event.preventDefault();
    event.shiftKey ? redo() : undo();
    return;
  }
  if (mod && key === "y") {
    event.preventDefault();
    redo();
    return;
  }
  if (mod && key === "d") {
    event.preventDefault();
    act("duplicate");
    return;
  }
  if (mod && key === "g") {
    event.preventDefault();
    act(event.shiftKey ? "ungroup" : "group");
    return;
  }
  if (mod && key === "a") {
    event.preventDefault();
    selection = new Set(
      currentNodes()
        .filter((n) => n.visible && !n.locked)
        .map((n) => n.id),
    );
    draw();
    return;
  }
  if (!mod) {
    const t = TOOLS.find((t) => t.key.toLowerCase() === key);
    if (t) {
      changeTool(t.id);
      return;
    }
  }
  if (preview) return;
  if (event.key === "Delete" || event.key === "Backspace") {
    event.preventDefault();
    if (tool === "nodes" && activePoint !== null) removeActiveNode();
    else act("delete");
    return;
  }
  if (event.key.startsWith("Arrow") && editable().length) {
    event.preventDefault();
    const d = event.shiftKey ? 10 : 1,
      dx = event.key === "ArrowRight" ? d : event.key === "ArrowLeft" ? -d : 0,
      dy = event.key === "ArrowDown" ? d : event.key === "ArrowUp" ? -d : 0;
    commit("Nudge objects", () =>
      editable().forEach(
        (n) => (n.matrix = multiply(translate(dx, dy), n.matrix)),
      ),
    );
  }
});
document.addEventListener("keyup", (event) => {
  if (event.code === "Space") spaceDown = false;
});
window.addEventListener("blur", () => {
  spaceDown = false;
  if (gesture) cancelGesture();
});
window.addEventListener("beforeunload", (event) => {
  autosave.flush();
  if (unsavedDownload && $("#save-status").dataset.status !== "saved") {
    event.preventDefault();
    event.returnValue = "";
  }
});
new ResizeObserver(() => {
  if (!gesture) fit();
}).observe(scroll);
validateProject(project);
draw();
requestAnimationFrame(fit);
try {
  const saved = await recover();
  if (saved && documentEpoch === 0) {
    await verifyAssets(saved.project);
    if (documentEpoch !== 0)
      throw new Error("Scene changed while recovery was loading");
    project = saved.project;
    time = 0;
    history.clear();
    draw();
    fit();
    $("#save-status").textContent = "Recovered on this computer";
    $("#save-status").dataset.status = "saved";
  }
} catch (e) {
  toast(
    `Local recovery is unavailable: ${e.message}. You can still open and save project files.`,
    true,
  );
}
