// Affine matrices preserve grouped transforms (including skew) without lossy
// decomposition. Points are column vectors; multiply(a, b) applies b first.
export const IDENTITY = [1, 0, 0, 1, 0, 0];
export const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
export const round = (v, n = 3) => Number(v.toFixed(n));
export const translate = (x, y) => [1, 0, 0, 1, x, y];
export const scale = (x, y = x) => [x, 0, 0, y, 0, 0];
export function rotate(degrees) {
  const r = (degrees * Math.PI) / 180,
    c = Math.cos(r),
    s = Math.sin(r);
  return [c, s, -s, c, 0, 0];
}
export function multiply(a, b) {
  return [
    a[0] * b[0] + a[2] * b[1],
    a[1] * b[0] + a[3] * b[1],
    a[0] * b[2] + a[2] * b[3],
    a[1] * b[2] + a[3] * b[3],
    a[0] * b[4] + a[2] * b[5] + a[4],
    a[1] * b[4] + a[3] * b[5] + a[5],
  ];
}
export function inverse(m) {
  const d = m[0] * m[3] - m[1] * m[2];
  if (Math.abs(d) < 1e-10) throw new Error("Transform cannot be inverted.");
  return [
    m[3] / d,
    -m[1] / d,
    -m[2] / d,
    m[0] / d,
    (m[2] * m[5] - m[3] * m[4]) / d,
    (m[1] * m[4] - m[0] * m[5]) / d,
  ];
}
export const point = (m, p) => ({
  x: m[0] * p.x + m[2] * p.y + m[4],
  y: m[1] * p.x + m[3] * p.y + m[5],
});
export const around = (x, y, m) =>
  multiply(translate(x, y), multiply(m, translate(-x, -y)));
export function union(boxes) {
  if (!boxes.length) return { x: 0, y: 0, width: 0, height: 0 };
  const x = Math.min(...boxes.map((b) => b.x)),
    y = Math.min(...boxes.map((b) => b.y));
  return {
    x,
    y,
    width: Math.max(...boxes.map((b) => b.x + b.width)) - x,
    height: Math.max(...boxes.map((b) => b.y + b.height)) - y,
  };
}
export function transformBox(box, m) {
  const p = [
    point(m, { x: box.x, y: box.y }),
    point(m, { x: box.x + box.width, y: box.y }),
    point(m, { x: box.x + box.width, y: box.y + box.height }),
    point(m, { x: box.x, y: box.y + box.height }),
  ];
  return union(p.map((v) => ({ ...v, width: 0, height: 0 })));
}
export function localBounds(node) {
  if (node.type === "group") return union(node.children.map(bounds));
  if (node.type === "path") {
    const points = node.points.flatMap((p) => [
      { x: p.x, y: p.y },
      ...(p.in ? [p.in] : []),
      ...(p.out ? [p.out] : []),
    ]);
    const b = union(points.map((p) => ({ ...p, width: 0, height: 0 })));
    return { ...b, width: Math.max(1, b.width), height: Math.max(1, b.height) };
  }
  return { x: 0, y: 0, width: node.width, height: node.height };
}
export const bounds = (node) => transformBox(localBounds(node), node.matrix);
export const selectionBounds = (nodes) => union(nodes.map(bounds));
// The viewport has the artboard's aspect ratio. Equal normalized spans include
// a tall or wide focus region without SVG's slice behavior cropping the target.
export function cameraViewport(region) {
  const span = Math.max(region.width, region.height);
  return {
    x: clamp(region.x + region.width / 2 - span / 2, 0, 1 - span),
    y: clamp(region.y + region.height / 2 - span / 2, 0, 1 - span),
    width: span,
    height: span,
  };
}
export function fitRegion(box, width, height, padding = 0.12) {
  const px = box.width * padding,
    py = box.height * padding;
  const x = clamp(box.x - px, 0, width - 1),
    y = clamp(box.y - py, 0, height - 1);
  return {
    x: x / width,
    y: y / height,
    width: Math.max(1, Math.min(width - x, box.width + px * 2)) / width,
    height: Math.max(1, Math.min(height - y, box.height + py * 2)) / height,
  };
}
