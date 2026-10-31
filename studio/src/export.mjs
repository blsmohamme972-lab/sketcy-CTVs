import { validateProject, MODES, readiness } from "./model.mjs";
import { svgDocument } from "./scene.mjs";
import { loadImage } from "./assets.mjs";
import {
  multiply,
  IDENTITY,
  transformBox,
  localBounds,
  clamp,
  union,
  selectionBounds,
} from "./geometry.mjs";
export const filename = (name) =>
  name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 70) || "sketcy-scene";
export function download(blob, name) {
  const url = URL.createObjectURL(blob),
    a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export function projectBlob(project) {
  validateProject(project);
  return new Blob([JSON.stringify(project, null, 2) + "\n"], {
    type: "application/json",
  });
}
export function svgBlob(project, opts) {
  return new Blob([svgDocument(project, opts)], { type: "image/svg+xml" });
}
// Measure real text glyphs as well as geometry. Integer crop coordinates keep
// independently rasterized layers on the same pixel grid when recomposed.
export function selectionBox(project, nodes) {
  const host = document.createElement("div");
  host.style.cssText =
    "position:fixed;left:-100000px;top:0;visibility:hidden;pointer-events:none";
  host.innerHTML = svgDocument(project, { nodes, background: false });
  document.body.append(host);
  try {
    const actual = host.querySelector("svg").getBBox();
    const b = union([selectionBounds(nodes), actual]);
    let pad = 8;
    function visit(items, parent) {
      for (const n of items) {
        if (!n.visible) continue;
        const m = multiply(parent, n.matrix);
        if (n.children) visit(n.children, m);
        else if (n.stroke !== "none") {
          // A conservative affine bound for round line caps and joins.
          pad = Math.max(pad, n.strokeWidth * Math.hypot(...m.slice(0, 4)));
        }
      }
    }
    visit(nodes, IDENTITY);
    const x = Math.floor(b.x - pad),
      y = Math.floor(b.y - pad);
    return {
      x,
      y,
      width: Math.ceil(b.x + b.width + pad) - x,
      height: Math.ceil(b.y + b.height + pad) - y,
    };
  } finally {
    host.remove();
  }
}
export async function pngBlob(project, opts = {}) {
  const svg = svgBlob(project, opts),
    url = URL.createObjectURL(svg);
  try {
    const im = await loadImage(url),
      canvas = document.createElement("canvas");
    const ratio = Math.min(1, 4096 / im.naturalWidth, 4096 / im.naturalHeight);
    canvas.width = Math.max(1, Math.round(im.naturalWidth * ratio));
    canvas.height = Math.max(1, Math.round(im.naturalHeight * ratio));
    canvas.getContext("2d").drawImage(im, 0, 0, canvas.width, canvas.height);
    return await new Promise((resolve, reject) =>
      canvas.toBlob(
        (b) => (b ? resolve(b) : reject(new Error("PNG export failed."))),
        "image/png",
      ),
    );
  } finally {
    URL.revokeObjectURL(url);
  }
}
export function handoff(project, partId = "part-01") {
  validateProject(project);
  if (!/^[A-Za-z0-9][A-Za-z0-9_-]{0,79}$/.test(partId))
    throw new Error("Invalid part ID.");
  const symbols = [];
  function visit(nodes, parent) {
    for (const n of nodes) {
      if (!n.visible) continue;
      const m = multiply(parent, n.matrix),
        b = transformBox(localBounds(n), m),
        x = clamp(b.x, 0, project.width),
        y = clamp(b.y, 0, project.height),
        right = clamp(b.x + b.width, 0, project.width),
        bottom = clamp(b.y + b.height, 0, project.height);
      if (n.factIds.length && right > x && bottom > y)
        symbols.push({
          id: n.id,
          partId,
          label: n.name,
          meaning: n.factIds
            .map((id) => project.facts.find((f) => f.id === id)?.text || "")
            .join(" "),
          factIds: n.factIds,
          region: {
            x: x / project.width,
            y: y / project.height,
            width: (right - x) / project.width,
            height: (bottom - y) / project.height,
          },
        });
      if (n.children) visit(n.children, m);
    }
  }
  visit(project.nodes, IDENTITY);
  const known = new Set(symbols.map((s) => s.id));
  const plan = {
    lessonId: project.id,
    contentType: project.contentType,
    parts: [
      {
        id: partId,
        tracks: Object.fromEntries(
          MODES.map((mode) => [
            mode,
            project.tracks[mode].cues.map((c) => ({
              id: c.id,
              text: c.text,
              factIds: c.factIds,
              symbolIds: c.layerIds.filter((id) => known.has(id)),
            })),
          ]),
        ),
      },
    ],
  };
  const lesson = {
    schemaVersion: project.contentType === "EXTERNAL_REVIEW" ? 2 : 1,
    lessonId: project.id,
    revision: 1,
    title: project.title,
    specialty: "Visual lessons",
    language: "en",
    contentType: project.contentType,
    sources: project.sources.map(
      ({ id, title, sha256, userProvided, excerpts, externalUrl }) => ({
        id,
        title,
        sha256,
        userProvided,
        excerpts,
        ...(externalUrl ? { externalUrl } : {}),
      }),
    ),
    facts: project.facts,
    parts: [
      {
        id: partId,
        title: project.title,
        objectives: project.facts.map((f) => f.text),
        illustrationPath: "images/scene.png",
        factIds: project.facts.map((f) => f.id),
      },
    ],
    symbols,
    questions: project.facts.map((f, i) => ({
      id: `recall-${i + 1}`,
      factId: f.id,
      partId,
      type: "IMAGE_RECALL",
      prompt: "Recall this fact using its scene cue.",
      answer: f.text,
      explanation: "Compare your answer with the cited source.",
      symbolId: symbols.find((s) => s.factIds.includes(f.id))?.id ?? null,
      choices: [],
      correctChoiceId: null,
    })),
    quality: {
      sourceCoverageReviewed: false,
      audioReviewed: false,
      reviewer: "",
      notes:
        "Studio authoring draft; source completeness and listening have not been approved.",
    },
  };
  return {
    schema: "sketcy.studio-handoff.v1",
    releaseReady: false,
    notes:
      "This is an authoring handoff, not an Android lesson package. Export the scene PNG separately. Generate and review real Breeze CPU narration with the production tools. Object motion remains in the Studio project.",
    issues: readiness(project),
    lesson,
    narrationPlan: plan,
    timingDraft: project.tracks,
    sceneFilename: "scene.png",
  };
}
