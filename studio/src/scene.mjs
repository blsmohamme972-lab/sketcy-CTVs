import { animatedMatrix } from "./timeline.mjs";
import { frameAt } from "./timeline.mjs";
import { round, cameraViewport } from "./geometry.mjs";
export const esc = (v) =>
  String(v).replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
const p = (v) => round(v, 4);
export function pathData(node) {
  if (!node.points.length) return "";
  const pts = node.points;
  let d = `M ${p(pts[0].x)} ${p(pts[0].y)}`;
  for (let i = 1; i < pts.length + (node.closed ? 1 : 0); i++) {
    const a = pts[i - 1],
      b = pts[i % pts.length];
    if (a.out || b.in) {
      const c = a.out || a,
        e = b.in || b;
      d += ` C ${p(c.x)} ${p(c.y)} ${p(e.x)} ${p(e.y)} ${p(b.x)} ${p(b.y)}`;
    } else d += ` L ${p(b.x)} ${p(b.y)}`;
  }
  return d + (node.closed ? " Z" : "");
}
export function nodeMarkup(n, project, options = {}) {
  if (!n.visible) return "";
  const matrix = options.animate
    ? animatedMatrix(n, options.mode, options.time, options.reducedMotion)
    : n.matrix;
  const style = `fill="${n.fill}" stroke="${n.stroke}" stroke-width="${n.strokeWidth}" stroke-linecap="round" stroke-linejoin="round"`;
  let body = "";
  if (n.type === "rect")
    body = `<rect width="${n.width}" height="${n.height}" rx="${n.radius}" ${style}/>`;
  if (n.type === "ellipse")
    body = `<ellipse cx="${n.width / 2}" cy="${n.height / 2}" rx="${n.width / 2}" ry="${n.height / 2}" ${style}/>`;
  if (n.type === "path") body = `<path d="${pathData(n)}" ${style}/>`;
  if (n.type === "text")
    body = `<text x="0" y="${n.fontSize}" font-family="${n.fontFamily}" font-size="${n.fontSize}" font-weight="${n.fontWeight}" ${style}>${n.text
      .split("\n")
      .map(
        (line, i) =>
          `<tspan x="0" dy="${i ? n.fontSize * 1.2 : 0}">${esc(line) || " "}</tspan>`,
      )
      .join("")}</text>`;
  if (n.type === "image")
    body = `<image width="${n.width}" height="${n.height}" href="${esc(project.assets[n.assetId].data)}" preserveAspectRatio="none"/>`;
  if (n.type === "group")
    body = n.children.map((c) => nodeMarkup(c, project, options)).join("");
  return `<g data-node="${esc(n.id)}" transform="matrix(${matrix.map((v) => p(v)).join(" ")})" opacity="${n.opacity}"${n.locked ? ' data-locked="true"' : ""}>${body}</g>`;
}
export function artworkMarkup(project, options = {}) {
  return (
    (project.background === "none"
      ? ""
      : `<rect width="${project.width}" height="${project.height}" fill="${project.background}" pointer-events="none"/>`) +
    project.nodes.map((n) => nodeMarkup(n, project, options)).join("")
  );
}
export function svgDocument(
  project,
  { nodes = null, box = null, background = true, frame = null } = {},
) {
  let b = box || { x: 0, y: 0, width: project.width, height: project.height };
  const options = frame
    ? {
        animate: true,
        mode: frame.mode,
        time: frame.time,
        reducedMotion: frame.reducedMotion,
      }
    : {};
  if (frame) {
    const c = cameraViewport(
      frameAt(project.tracks[frame.mode], frame.time, frame.reducedMotion)
        .camera,
    );
    b = {
      x: c.x * project.width,
      y: c.y * project.height,
      width: c.width * project.width,
      height: c.height * project.height,
    };
  }
  const body = nodes
    ? nodes.map((n) => nodeMarkup(n, project, options)).join("")
    : artworkMarkup(
        background ? project : { ...project, background: "none" },
        options,
      );
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${Math.ceil(frame ? project.width : b.width)}" height="${Math.ceil(frame ? project.height : b.height)}" viewBox="${b.x} ${b.y} ${b.width} ${b.height}" preserveAspectRatio="xMidYMid ${frame ? "slice" : "meet"}"><title>${esc(project.title)}</title>${body}</svg>`;
}
