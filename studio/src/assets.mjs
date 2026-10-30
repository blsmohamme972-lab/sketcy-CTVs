import { LIMITS, uid } from "./model.mjs";

export function bytesFromData(data) {
  const raw = atob(data.slice(data.indexOf(",") + 1)),
    out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}
export function dataFromBytes(bytes, mime) {
  let raw = "";
  for (let i = 0; i < bytes.length; i += 16384)
    raw += String.fromCharCode(...bytes.subarray(i, i + 16384));
  return `data:${mime};base64,${btoa(raw)}`;
}
export function inspectWav(bytes) {
  if (bytes.byteLength < 44 || bytes.byteLength > LIMITS.assetBytes)
    throw new Error("WAV must be a complete file of at most 32 MiB.");
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const four = (i) => String.fromCharCode(...bytes.subarray(i, i + 4));
  if (
    four(0) !== "RIFF" ||
    four(8) !== "WAVE" ||
    view.getUint32(4, true) + 8 !== bytes.length
  )
    throw new Error("Invalid RIFF/WAVE length.");
  let format = null,
    pcm = null;
  for (let i = 12; i + 8 <= bytes.length; ) {
    const size = view.getUint32(i + 4, true),
      start = i + 8,
      end = start + size;
    if (end > bytes.length) throw new Error("Truncated WAV chunk.");
    if (four(i) === "fmt ") {
      if (format || size < 16) throw new Error("Invalid WAV format chunk.");
      format = {
        codec: view.getUint16(start, true),
        channels: view.getUint16(start + 2, true),
        rate: view.getUint32(start + 4, true),
        byteRate: view.getUint32(start + 8, true),
        align: view.getUint16(start + 12, true),
        bits: view.getUint16(start + 14, true),
      };
    }
    if (four(i) === "data") {
      if (pcm) throw new Error("Duplicate WAV data.");
      pcm = { start, size };
    }
    i = end + (size % 2);
  }
  if (
    !format ||
    !pcm ||
    format.codec !== 1 ||
    format.channels !== 1 ||
    format.rate !== 24000 ||
    format.bits !== 16 ||
    format.align !== 2 ||
    format.byteRate !== 48000 ||
    pcm.size % 2
  )
    throw new Error("Use Breeze-compatible PCM16 mono WAV at 24,000 Hz.");
  const durationMs = Math.round(pcm.size / 48);
  if (durationMs < 1000 || durationMs > 240000)
    throw new Error(
      "Preview WAVs must last 1–240 seconds; released tracks require 60–240 seconds.",
    );
  let nonzero = false,
    peak = 0;
  const waveform = [];
  const samples = pcm.size / 2,
    bucket = Math.max(1, Math.ceil(samples / 160));
  for (let i = 0; i < samples; i++) {
    const value = Math.abs(view.getInt16(pcm.start + i * 2, true));
    if (value) nonzero = true;
    peak = Math.max(peak, value);
    const b = Math.floor(i / bucket);
    waveform[b] = Math.max(waveform[b] || 0, value / 32768);
  }
  if (!nonzero)
    throw new Error("The WAV contains only silence. Attach actual narration.");
  return {
    durationMs,
    sampleRate: 24000,
    channels: 1,
    bits: 16,
    peak: peak / 32768,
    waveform,
  };
}
export function loadImage(data) {
  return new Promise((resolve, reject) => {
    const im = new Image();
    im.onload = () => resolve(im);
    im.onerror = () => reject(new Error("This image could not be decoded."));
    im.src = data;
  });
}
export async function inspectImage(data) {
  const comma = data.indexOf(","),
    type = data.slice(5, data.indexOf(";")),
    header = atob(data.slice(comma + 1, comma + 33));
  const ok =
    type === "image/png"
      ? header.startsWith("\x89PNG\r\n\x1a\n")
      : type === "image/jpeg"
        ? header.startsWith("\xff\xd8\xff")
        : type === "image/webp"
          ? header.startsWith("RIFF") && header.slice(8, 12) === "WEBP"
          : false;
  if (!ok)
    throw new Error(
      "Image bytes do not match a supported PNG, JPEG or WebP format.",
    );
  const im = await loadImage(data);
  if (
    im.naturalWidth > 4096 ||
    im.naturalHeight > 4096 ||
    !im.naturalWidth ||
    !im.naturalHeight
  )
    throw new Error("Images must be at most 4096 × 4096 pixels.");
  // Inspect actual alpha, not a checkerboard preview or the file extension.
  const canvas = document.createElement("canvas");
  canvas.width = im.naturalWidth;
  canvas.height = im.naturalHeight;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  ctx.drawImage(im, 0, 0);
  const rgba = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
  let hasTransparency = false;
  for (let i = 3; i < rgba.length; i += 4)
    if (rgba[i] < 255) {
      hasTransparency = true;
      break;
    }
  const result = {
    width: im.naturalWidth,
    height: im.naturalHeight,
    hasTransparency,
  };
  canvas.width = canvas.height = 1;
  return result;
}
export async function imageAsset(file) {
  if (file.size > LIMITS.assetBytes)
    throw new Error("An image must be at most 32 MiB.");
  const mime = file.type;
  if (!["image/png", "image/jpeg", "image/webp"].includes(mime))
    throw new Error(
      "Import PNG, JPEG or WebP. SVG and executable formats are not accepted as image assets.",
    );
  const bytes = new Uint8Array(await file.arrayBuffer()),
    data = dataFromBytes(bytes, mime),
    info = await inspectImage(data);
  return { id: uid("asset"), asset: { name: file.name, mime, data, ...info } };
}
export async function audioAsset(file) {
  if (file.size > LIMITS.assetBytes)
    throw new Error("A WAV must be at most 32 MiB.");
  const bytes = new Uint8Array(await file.arrayBuffer()),
    info = inspectWav(bytes);
  return {
    id: uid("asset"),
    asset: {
      name: file.name,
      mime: "audio/wav",
      data: dataFromBytes(bytes, "audio/wav"),
      ...info,
      provenance: "unverified_local_import",
    },
  };
}
export async function verifyAssets(project) {
  for (const asset of Object.values(project.assets)) {
    if (asset.mime === "audio/wav") {
      const info = inspectWav(bytesFromData(asset.data));
      if (info.durationMs !== asset.durationMs)
        throw new Error("Stored WAV duration does not match its samples.");
      Object.assign(asset, info);
    } else {
      const info = await inspectImage(asset.data);
      if (info.width !== asset.width || info.height !== asset.height)
        throw new Error("Stored image dimensions do not match its pixels.");
      asset.hasTransparency = info.hasTransparency;
    }
  }
  for (const track of Object.values(project.tracks))
    if (
      track.audioAssetId &&
      project.assets[track.audioAssetId].durationMs !== track.durationMs
    )
      throw new Error("Track duration does not match its attached WAV.");
}
export function retimeTrack(project, mode, durationMs) {
  const track = project.tracks[mode],
    ratio = durationMs / track.durationMs;
  const visit = (nodes) =>
    nodes.forEach((n) => {
      n.motion[mode] = n.motion[mode]
        .map((k) => ({ ...k, atMs: Math.round(k.atMs * ratio) }))
        .filter((k, i, a) => !i || k.atMs !== a[i - 1].atMs);
      if (n.children) visit(n.children);
    });
  visit(project.nodes);
  track.cues = track.cues.map((c) => ({
    ...c,
    startMs: Math.round(c.startMs * ratio),
    endMs: Math.round(c.endMs * ratio),
  }));
  track.durationMs = durationMs;
  track.timingStatus = "manual_draft";
}
