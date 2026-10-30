#!/usr/bin/env node
/** Internal authoring entry point. No student-facing UI or remote generation API. */
import {
  readFile,
  writeFile,
  stat,
  mkdir,
  rename,
  access,
  realpath,
} from "node:fs/promises";
import {
  resolve,
  relative,
  dirname,
  extname,
  basename,
  isAbsolute,
  sep,
} from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";
import {
  emptyProject,
  makeNode,
  validateProject,
  uid,
  flatten,
  findNode,
  snapshot,
  removeNodes,
  groupNodes,
  ungroupNode,
  readiness,
  MODES,
  LIMITS,
} from "./src/model.mjs";
import { demoProject } from "./src/demo.mjs";
import { translate, multiply, scale, bounds } from "./src/geometry.mjs";
import { inspectWav, dataFromBytes, retimeTrack } from "./src/assets.mjs";
import { svgDocument } from "./src/scene.mjs";
import { handoff, filename } from "./src/export.mjs";
const repository = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2),
  command = args.shift(),
  options = {};
const bools = new Set(["demo", "force", "background", "reduced-motion"]);
for (let i = 0; i < args.length; i++) {
  if (!args[i].startsWith("--")) throw new Error("Options must start with --.");
  const key = args[i].slice(2);
  options[key] = bools.has(key) ? true : args[++i];
  if (options[key] === undefined) throw new Error(`Missing --${key} value.`);
}
const required = (name) => {
  if (!options[name]) throw new Error(`--${name} is required.`);
  return options[name];
};
const digest = (bytes) => createHash("sha256").update(bytes).digest("hex");
async function readProject() {
  const path = resolve(required("project"));
  if ((await stat(path)).size > LIMITS.projectBytes)
    throw new Error("Project exceeds 128 MiB.");
  return validateProject(JSON.parse(await readFile(path, "utf8")));
}
function privateOutput(path) {
  const absolute = resolve(path),
    rel = relative(repository, absolute);
  if (
    rel === "" ||
    (!rel.startsWith(".." + sep) && rel !== ".." && !isAbsolute(rel))
  )
    throw new Error(
      "Keep projects, media and source excerpts outside the Git repository.",
    );
  return absolute;
}
async function ensureWritable(path) {
  const out = privateOutput(path);
  await mkdir(dirname(out), { recursive: true });
  privateOutput(resolve(await realpath(dirname(out)), basename(out)));
  if (!options.force) {
    try {
      await access(out);
      throw new Error(
        "Output exists. Use a new path, or --force for an intentional replacement.",
      );
    } catch (e) {
      if (e.code !== "ENOENT") throw e;
    }
  }
  return out;
}
async function saveJson(path, value) {
  const out = await ensureWritable(path),
    text = JSON.stringify(value, null, 2) + "\n";
  if (options.force) {
    const temp = out + ".writing-" + uid("tmp");
    await writeFile(temp, text, { flag: "wx" });
    await rename(temp, out);
  } else await writeFile(out, text, { flag: "wx" });
  return { path: out, bytes: Buffer.byteLength(text), sha256: digest(text) };
}
const report = (value) =>
  process.stdout.write(JSON.stringify(value, null, 2) + "\n");
async function renderApi(project, fn) {
  const { withRenderer } = await import("./src/browser-render.mjs");
  return withRenderer(project, fn);
}
function nonemptyParent(project, id) {
  function visit(nodes) {
    if (nodes.some((n) => n.id === id)) return nodes;
    for (const n of nodes)
      if (n.children) {
        const got = visit(n.children);
        if (got) return got;
      }
    return null;
  }
  return visit(project.nodes);
}
function patch(project, operations) {
  if (!Array.isArray(operations) || operations.length > 1000)
    throw new Error("Operations must be an array of at most 1,000 items.");
  for (const op of operations) {
    if (op.op === "add-source") project.sources.push(op.source);
    else if (op.op === "add-fact") project.facts.push(op.fact);
    else if (op.op === "set-title") project.title = op.title;
    else if (op.op === "set-policy") project.contentType = op.contentType;
    else if (op.op === "set-canvas") {
      if (op.width !== undefined) project.width = op.width;
      if (op.height !== undefined) project.height = op.height;
      if (op.background !== undefined) project.background = op.background;
    } else if (op.op === "add-layer") {
      const parent = op.parentId ? findNode(project, op.parentId) : null;
      if (op.parentId && parent?.type !== "group")
        throw new Error("Parent must be an existing group.");
      (parent ? parent.children : project.nodes).push(
        makeNode(op.layer.type, op.layer),
      );
    } else if (op.op === "update-layer") {
      const node = findNode(project, op.id);
      if (!node) throw new Error("Layer not found.");
      const allowed = new Set([
        "name",
        "matrix",
        "width",
        "height",
        "fill",
        "stroke",
        "strokeWidth",
        "opacity",
        "visible",
        "locked",
        "factIds",
        "motion",
        "role",
        "text",
        "fontSize",
        "fontFamily",
        "fontWeight",
        "points",
        "closed",
        "radius",
      ]);
      for (const [key, value] of Object.entries(op.changes)) {
        if (!allowed.has(key))
          throw new Error(`Unsupported layer property: ${key}`);
        node[key] = value;
      }
    } else if (op.op === "remove-layer") {
      const nodes = nonemptyParent(project, op.id);
      if (!nodes) throw new Error("Layer not found.");
      removeNodes(nodes, [op.id], project);
    } else if (op.op === "set-track") {
      if (!MODES.includes(op.mode))
        throw new Error("Mode must be explanation or story.");
      project.tracks[op.mode] = op.track;
    } else if (op.op === "group") {
      const nodes = op.parentId
        ? findNode(project, op.parentId)?.children
        : project.nodes;
      if (!nodes) throw new Error("Parent group not found.");
      const g = groupNodes(nodes, op.ids);
      if (op.name) g.name = op.name;
    } else if (op.op === "ungroup") {
      const nodes = nonemptyParent(project, op.id);
      if (!nodes) throw new Error("Layer not found.");
      ungroupNode(nodes, op.id, project);
    } else throw new Error(`Unknown operation: ${op.op}`);
  }
  return validateProject(project);
}
async function run() {
  if (!command || command === "help") {
    console.log(
      `Sketcy Studio — internal agent authoring\n\nnode studio/agent.mjs new --title "Scene" --out /private/scene.sketcy-studio.json [--demo]\nnode studio/agent.mjs validate --project /private/scene.sketcy-studio.json\nnode studio/agent.mjs patch --project /private/scene.sketcy-studio.json --ops /private/ops.json --out /private/revised.sketcy-studio.json\nnode studio/agent.mjs add-image --project ... --image /private/object.png --out ... [--background] [--x 100 --y 200 --width 300]\nnode studio/agent.mjs add-audio --project ... --audio /private/explanation.wav --mode explanation --out ...\nnode studio/agent.mjs render --project ... --out /private/scene.png [--mode story --time-ms 15000] [--reduced-motion]\nnode studio/agent.mjs layers --project ... --out-dir /private/layers\nnode studio/agent.mjs handoff --project ... --out-dir /private/production\n\nSVG rendering and validation need Node 22+. PNG rendering and asset inspection also need npm ci, Playwright Chromium and Python 3. All generated outputs must stay outside Git. Existing outputs are protected unless --force is explicit.`,
    );
    return;
  }
  if (command === "new") {
    const p = options.demo
      ? demoProject()
      : emptyProject(options.title || "Untitled scene");
    if (options.title) p.title = options.title;
    validateProject(p);
    return report(await saveJson(required("out"), p));
  }
  const project = await readProject();
  if (command === "validate")
    return report({
      valid: true,
      schema: project.schema,
      projectId: project.id,
      layers: flatten(project.nodes).length,
      assets: Object.keys(project.assets).length,
      facts: project.facts.length,
      issues: readiness(project),
      scope:
        "Structural validation. Pixel decoding, human reviews and Android acceptance are separate.",
    });
  if (command === "patch") {
    const bytes = await readFile(required("ops"));
    if (bytes.length > 4 * 1024 * 1024)
      throw new Error("Operations exceed 4 MiB.");
    patch(project, JSON.parse(bytes));
    return report(await saveJson(required("out"), project));
  }
  if (command === "add-image") {
    const path = resolve(required("image")),
      fileStat = await stat(path);
    if (fileStat.size > LIMITS.assetBytes)
      throw new Error("Image exceeds 32 MiB.");
    const mime = {
      ".png": "image/png",
      ".jpg": "image/jpeg",
      ".jpeg": "image/jpeg",
      ".webp": "image/webp",
    }[extname(path).toLowerCase()];
    if (!mime) throw new Error("Use a local PNG, JPEG or WebP image.");
    const bytes = new Uint8Array(await readFile(path)),
      data = dataFromBytes(bytes, mime),
      info = await renderApi(null, (api) => api.inspectImage(data)),
      assetId = uid("asset");
    project.assets[assetId] = { name: basename(path), mime, data, ...info };
    let ratio = options.width
      ? Number(options.width) / info.width
      : options.background
        ? Math.max(project.width / info.width, project.height / info.height)
        : Math.min(
            1,
            (project.width * 0.55) / info.width,
            (project.height * 0.65) / info.height,
          );
    if (!Number.isFinite(ratio) || ratio <= 0)
      throw new Error("Invalid image width.");
    const x =
        options.x !== undefined
          ? Number(options.x)
          : (project.width - info.width * ratio) / 2,
      y =
        options.y !== undefined
          ? Number(options.y)
          : (project.height - info.height * ratio) / 2;
    const n = makeNode("image", {
      name: options.name || basename(path),
      assetId,
      width: info.width,
      height: info.height,
      matrix: multiply(translate(x, y), scale(ratio)),
      role: options.background ? "background" : "element",
      locked: !!options.background,
      fill: "none",
      stroke: "none",
    });
    if (options.background) project.nodes.unshift(n);
    else project.nodes.push(n);
    validateProject(project);
    return report({
      ...(await saveJson(required("out"), project)),
      layerId: n.id,
      assetId,
      hasTransparency: info.hasTransparency,
    });
  }
  if (command === "add-audio") {
    const mode = required("mode");
    if (!MODES.includes(mode))
      throw new Error("Mode must be explanation or story.");
    const path = resolve(required("audio"));
    if ((await stat(path)).size > LIMITS.assetBytes)
      throw new Error("WAV exceeds 32 MiB.");
    const bytes = new Uint8Array(await readFile(path)),
      info = inspectWav(bytes),
      assetId = uid("asset");
    project.assets[assetId] = {
      name: basename(path),
      mime: "audio/wav",
      data: dataFromBytes(bytes, "audio/wav"),
      ...info,
      provenance: "unverified_local_import",
    };
    retimeTrack(project, mode, info.durationMs);
    project.tracks[mode].audioAssetId = assetId;
    validateProject(project);
    return report({
      ...(await saveJson(required("out"), project)),
      durationMs: info.durationMs,
      alignment:
        "Existing cues rescaled as a draft. No listening or origin approval.",
    });
  }
  if (command === "render") {
    const out = await ensureWritable(required("out")),
      mode = options.mode || "explanation";
    if (!MODES.includes(mode)) throw new Error("Invalid mode.");
    const frame =
      options["time-ms"] !== undefined
        ? {
            mode,
            time: Number(options["time-ms"]),
            reducedMotion: !!options["reduced-motion"],
          }
        : null;
    if (
      frame &&
      (!Number.isFinite(frame.time) ||
        frame.time < 0 ||
        frame.time > project.tracks[mode].durationMs)
    )
      throw new Error("Frame time is outside the track.");
    if (extname(out).toLowerCase() === ".svg")
      await writeFile(out, svgDocument(project, { frame }), {
        flag: options.force ? "w" : "wx",
      });
    else if (extname(out).toLowerCase() === ".png")
      await renderApi(project, (api) => api.png(out, { frame }));
    else throw new Error("Render output must be PNG or SVG.");
    const data = await readFile(out);
    return report({
      path: out,
      bytes: data.length,
      sha256: digest(data),
      frame: frame || "base artwork",
    });
  }
  if (command === "layers") {
    let seenElement = false;
    for (const n of project.nodes.filter((n) => n.visible)) {
      if (n.role === "background" && seenElement)
        throw new Error(
          "Background layers must be below all element layers before exporting.",
        );
      if (n.role !== "background") seenElement = true;
      const candidates =
        n.role === "background" ? flatten([n]) : flatten(n.children || []);
      if (candidates.some((v) => MODES.some((mode) => v.motion[mode].length)))
        throw new Error(
          "Move animated background objects or nested animated children to top-level element layers before exporting.",
        );
    }
    const dir = privateOutput(required("out-dir"));
    await mkdir(dir, { recursive: true });
    const list = project.nodes.filter(
        (n) => n.visible && n.role !== "background",
      ),
      manifest = {
        schema: "sketcy.layer-assets.v1",
        canvas: { width: project.width, height: project.height },
        background: "background.png",
        androidV1IndependentMotion: false,
        layers: [],
      };
    const background = await ensureWritable(resolve(dir, "background.png"));
    const outputs = [];
    for (let i = 0; i < list.length; i++) {
      const n = list[i],
        file = `${String(i + 1).padStart(2, "0")}-${filename(n.name)}.png`;
      const path = await ensureWritable(resolve(dir, file));
      outputs.push({ node: n, path, file, index: i });
    }
    await ensureWritable(resolve(dir, "layers.layer-assets.json"));
    await renderApi(project, async (api) => {
      for (const item of outputs) {
        item.box = await api.selectionBox(item.node.id);
        if (item.box.width > 4096 || item.box.height > 4096)
          throw new Error(
            "A layer export exceeds 4096 pixels. Reduce its size before exporting.",
          );
      }
      await api.backgroundPng(background);
      manifest.backgroundSha256 = digest(await readFile(background));
      for (const item of outputs) {
        await api.selectionPng(item.path, item.node.id, item.box);
        const b = bounds(item.node);
        manifest.layers.push({
          id: item.node.id,
          name: item.node.name,
          file: item.file,
          z: item.index,
          placement: item.box,
          pivot: {
            x: (b.x + b.width / 2 - item.box.x) / item.box.width,
            y: (b.y + b.height / 2 - item.box.y) / item.box.height,
          },
          factIds: item.node.factIds,
          motion: item.node.motion,
          opacityBakedIntoPng: true,
          sha256: digest(await readFile(item.path)),
        });
      }
    });
    await saveJson(resolve(dir, "layers.layer-assets.json"), manifest);
    return report({
      directory: dir,
      background,
      layers: manifest.layers.length,
      complete: true,
      scope:
        "Base-pose raster layers and placement metadata, not an Android package.",
    });
  }
  if (command === "handoff") {
    const dir = privateOutput(required("out-dir"));
    await mkdir(resolve(dir, "images"), { recursive: true });
    const out = handoff(project),
      image = await ensureWritable(resolve(dir, "images/scene.png"));
    // Preflight all outputs before rendering or writing any project-derived text.
    for (const name of [
      "authoring.json",
      "narration-plan.json",
      "studio-handoff.json",
    ])
      await ensureWritable(resolve(dir, name));
    await renderApi(project, (api) => api.png(image));
    await saveJson(resolve(dir, "authoring.json"), {
      lesson: out.lesson,
      imageFiles: { "images/scene.png": image },
    });
    await saveJson(resolve(dir, "narration-plan.json"), out.narrationPlan);
    await saveJson(resolve(dir, "studio-handoff.json"), out);
    return report({
      directory: dir,
      files: [
        "images/scene.png",
        "authoring.json",
        "narration-plan.json",
        "studio-handoff.json",
      ],
      releaseReady: false,
      issues: out.issues,
    });
  }
  throw new Error(
    `Unknown command: ${command}. Run node studio/agent.mjs help.`,
  );
}
try {
  await run();
} catch (error) {
  console.error(`Sketcy Studio: ${error.message}`);
  process.exitCode = 1;
}
