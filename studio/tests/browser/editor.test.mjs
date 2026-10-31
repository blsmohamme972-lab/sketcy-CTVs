import test, { before, after } from "node:test";
import assert from "node:assert/strict";
import { chromium } from "playwright";
import { spawn, execFile } from "node:child_process";
import { promisify } from "node:util";
import { createHash } from "node:crypto";
import { readFile, writeFile, mkdir, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
let browser, server, base, temp;
before(async () => {
  temp = await mkdtemp(resolve(tmpdir(), "sketcy-studio-browser-"));
  server = spawn("python3", [resolve(root, "server.py"), "--port", "0"], {
    stdio: ["ignore", "pipe", "pipe"],
  });
  base = await new Promise((yes, no) => {
    const timer = setTimeout(
      () => no(new Error("Local Studio server did not start.")),
      10000,
    );
    server.stdout.on("data", (b) => {
      const m = String(b).match(/http:\/\/127\.0\.0\.1:\d+/);
      if (m) {
        clearTimeout(timer);
        yes(m[0]);
      }
    });
    server.on("error", no);
    server.on("exit", (c) => {
      if (c) no(new Error(`Server exited ${c}`));
    });
  });
  browser = await chromium.launch({ headless: true });
});
after(async () => {
  await browser?.close();
  server?.kill("SIGTERM");
  if (temp) await rm(temp, { recursive: true, force: true });
});
async function withPage(fn) {
  const context = await browser.newContext({
    viewport: { width: 1540, height: 1000 },
    acceptDownloads: true,
  });
  const page = await context.newPage(),
    errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  try {
    await page.goto(base);
    await page.waitForSelector("[data-node]");
    await fn(page);
    assert.deepEqual(errors, []);
  } finally {
    await context.close();
  }
}
const state = (page) =>
  page.evaluate(async () => (await import("/src/editor.mjs")).getProject());
const playback = (page) =>
  page.evaluate(async () => (await import("/src/editor.mjs")).getPlayback());
async function blank(page) {
  await page.getByRole("button", { name: "New", exact: true }).click();
  await page.getByRole("button", { name: "Start scene", exact: true }).click();
  await page.waitForFunction(
    () => document.querySelectorAll(".layer-row").length === 0,
  );
}
async function stagePoint(page, x, y) {
  return page.locator("#artboard").evaluate(
    (el, p) => {
      const point = new DOMPoint(p.x, p.y).matrixTransform(el.getScreenCTM());
      return { x: point.x, y: point.y };
    },
    { x, y },
  );
}
async function drag(page, a, b) {
  await page.mouse.move(a.x, a.y);
  await page.mouse.down();
  await page.mouse.move(b.x, b.y, { steps: 8 });
  await page.mouse.up();
}
async function drawRect(page, x = 150, y = 150, w = 300, h = 180) {
  await page.getByRole("button", { name: "Rectangle", exact: true }).click();
  await drag(
    page,
    await stagePoint(page, x, y),
    await stagePoint(page, x + w, y + h),
  );
}
async function scrub(page, time) {
  await page.locator("#playhead").evaluate((el, time) => {
    el.value = String(time);
    el.dispatchEvent(new Event("input", { bubbles: true }));
    el.dispatchEvent(new Event("change", { bubbles: true }));
  }, time);
}
async function downloaded(page, fn) {
  const promise = page.waitForEvent("download");
  await fn();
  const d = await promise,
    path = resolve(temp, d.suggestedFilename());
  await d.saveAs(path);
  return { path, bytes: await readFile(path) };
}
function wav(seconds = 2) {
  const rate = 24000,
    count = rate * seconds,
    a = Buffer.alloc(44 + count * 2);
  a.write("RIFF", 0);
  a.writeUInt32LE(a.length - 8, 4);
  a.write("WAVEfmt ", 8);
  a.writeUInt32LE(16, 16);
  a.writeUInt16LE(1, 20);
  a.writeUInt16LE(1, 22);
  a.writeUInt32LE(rate, 24);
  a.writeUInt32LE(rate * 2, 28);
  a.writeUInt16LE(2, 32);
  a.writeUInt16LE(16, 34);
  a.write("data", 36);
  a.writeUInt32LE(count * 2, 40);
  for (let i = 0; i < count; i++)
    a.writeInt16LE(
      Math.round(Math.sin((i * 2 * Math.PI * 220) / rate) * 500),
      44 + i * 2,
    );
  return a;
}

test("authoring workspace renders with no student navigation or hidden-control leak", async () =>
  withPage(async (page) => {
    assert.equal(await page.title(), "Sketcy Studio · Authoring");
    assert.equal(await page.locator(".layer-row").count(), 8);
    assert.equal(await page.locator("#leave-group").isVisible(), false);
    assert.equal(await page.locator("#remove-audio").isVisible(), false);
    assert.match(
      await page.locator(".author-note").textContent(),
      /Internal lesson authoring/,
    );
    await mkdir(resolve(root, "test-results"), { recursive: true });
    await page.screenshot({
      path: resolve(root, "test-results/studio-workspace.png"),
      fullPage: true,
    });
  }));
test("pointer drawing, moving and one-gesture undo/redo operate in scene coordinates", async () =>
  withPage(async (page) => {
    await blank(page);
    await drawRect(page);
    let p = await state(page);
    assert.equal(p.nodes.length, 1);
    assert.ok(Math.abs(p.nodes[0].width - 300) < 3);
    const before = [...p.nodes[0].matrix];
    await drag(
      page,
      await stagePoint(page, 260, 240),
      await stagePoint(page, 360, 290),
    );
    p = await state(page);
    assert.ok(Math.abs(p.nodes[0].matrix[4] - before[4] - 100) < 3);
    await page.locator("#undo").click();
    assert.deepEqual((await state(page)).nodes[0].matrix, before);
    await page.locator("#redo").click();
    assert.ok((await state(page)).nodes[0].matrix[4] > before[4] + 95);
  }));
test("layer locking prevents drag edits; grouping and ungrouping retain objects", async () =>
  withPage(async (page) => {
    await blank(page);
    await drawRect(page);
    await drawRect(page, 700, 300, 170, 160);
    let p = await state(page);
    const first = p.nodes[0].id,
      second = p.nodes[1].id;
    await page.locator(`[data-layer="${first}"]`).click();
    await page.locator(`[data-lock="${first}"]`).click();
    await drag(
      page,
      await stagePoint(page, 250, 240),
      await stagePoint(page, 350, 240),
    );
    assert.deepEqual((await state(page)).nodes[0].matrix, p.nodes[0].matrix);
    await page.locator(`[data-lock="${first}"]`).click();
    await page.locator(`[data-layer="${first}"]`).click();
    await page
      .locator(`[data-layer="${second}"]`)
      .click({ modifiers: ["Shift"] });
    await page.getByRole("button", { name: "Group", exact: true }).click();
    p = await state(page);
    assert.equal(p.nodes.length, 1);
    assert.equal(p.nodes[0].children.length, 2);
    await page.getByRole("button", { name: "Ungroup", exact: true }).click();
    assert.equal((await state(page)).nodes.length, 2);
  }));
test("pen creates Bézier handles and the direct-node tool edits anchors", async () =>
  withPage(async (page) => {
    await blank(page);
    await page
      .getByRole("button", { name: "Pen / Bézier path", exact: true })
      .click();
    const a = await stagePoint(page, 200, 200),
      b = await stagePoint(page, 400, 200),
      h = await stagePoint(page, 450, 150),
      c = await stagePoint(page, 600, 350);
    await page.mouse.click(a.x, a.y);
    await drag(page, b, h);
    await page.mouse.click(c.x, c.y);
    await page.keyboard.press("Enter");
    let p = await state(page);
    assert.equal(p.nodes[0].type, "path");
    assert.equal(p.nodes[0].points.length, 3);
    assert.ok(p.nodes[0].points[1].out);
    await page
      .getByRole("button", { name: "Edit path nodes", exact: true })
      .click();
    const anchor = page.locator('[data-point="0"][data-side="anchor"]');
    const box = await anchor.boundingBox();
    await drag(
      page,
      { x: box.x + box.width / 2, y: box.y + box.height / 2 },
      await stagePoint(page, 240, 250),
    );
    p = await state(page);
    assert.ok(Math.abs(p.nodes[0].points[0].x - 240) < 3);
  }));
test("real alpha survives import, transparent selection export and project reopen", async () =>
  withPage(async (page) => {
    await blank(page);
    const png = await page.evaluate(() => {
      const c = document.createElement("canvas");
      c.width = c.height = 24;
      const x = c.getContext("2d");
      x.fillStyle = "#ff0000";
      x.fillRect(6, 6, 12, 12);
      return c.toDataURL("image/png").split(",")[1];
    });
    await page.locator("#image-files").setInputFiles({
      name: "transparent-element.png",
      mimeType: "image/png",
      buffer: Buffer.from(png, "base64"),
    });
    await page.waitForFunction(
      () => document.querySelectorAll(".layer-row").length === 1,
    );
    let p = await state(page);
    assert.equal(Object.values(p.assets)[0].hasTransparency, true);
    const result = await downloaded(page, () =>
      page
        .getByRole("button", { name: "Export selection PNG", exact: true })
        .click(),
    );
    const pixels = await page.evaluate(async (base64) => {
      const im = new Image();
      im.src = "data:image/png;base64," + base64;
      await im.decode();
      const c = document.createElement("canvas");
      c.width = im.width;
      c.height = im.height;
      const x = c.getContext("2d");
      x.drawImage(im, 0, 0);
      return {
        corner: [...x.getImageData(0, 0, 1, 1).data],
        center: [
          ...x.getImageData(
            Math.floor(im.width / 2),
            Math.floor(im.height / 2),
            1,
            1,
          ).data,
        ],
      };
    }, result.bytes.toString("base64"));
    assert.equal(pixels.corner[3], 0);
    assert.deepEqual(pixels.center, [255, 0, 0, 255]);
    const saved = await downloaded(page, () =>
      page.getByRole("button", { name: /Save project/ }).click(),
    );
    assert.equal(
      JSON.parse(saved.bytes).assets[p.nodes[0].assetId].data,
      "data:image/png;base64," + png,
    );
    await blank(page);
    await page.locator("#project-file").setInputFiles(saved.path);
    await page
      .getByRole("button", { name: "Open project", exact: true })
      .click();
    await page.waitForFunction(
      () => document.querySelectorAll(".layer-row").length === 1,
    );
    p = await state(page);
    assert.equal(Object.values(p.assets)[0].hasTransparency, true);
  }));
test("mode switching follows shared facts and reduced motion holds camera and object transforms", async () =>
  withPage(async (page) => {
    await scrub(page, 15000);
    await page.locator('[data-track="story"]').click();
    assert.equal((await playback(page)).time, 45000);
    assert.match(await page.locator("#caption-text").textContent(), /lantern/i);
    const p = await state(page),
      lantern = p.nodes.find((n) => n.name.startsWith("Lantern"));
    const moving = await page
      .locator(`#artwork [data-node="${lantern.id}"]`)
      .getAttribute("transform");
    await page.locator("#reduced-motion").check();
    assert.equal(
      await page.locator("#artboard").getAttribute("viewBox"),
      "0 0 1600 900",
    );
    const fixed = await page
      .locator(`#artwork [data-node="${lantern.id}"]`)
      .getAttribute("transform");
    assert.notEqual(moving, fixed);
    assert.match(await page.locator("#caption-text").textContent(), /lantern/i);
    assert.ok((await page.locator("#highlights rect").count()) > 0);
  }));
test("an attached PCM WAV drives preview from the actual media clock", async () =>
  withPage(async (page) => {
    await page.locator("#audio-file").setInputFiles({
      name: "browser-test-only.wav",
      mimeType: "audio/wav",
      buffer: wav(2),
    });
    await page.waitForFunction(
      () => document.querySelector("#playhead").max === "2000",
    );
    assert.equal((await state(page)).tracks.explanation.durationMs, 2000);
    await page
      .getByRole("button", { name: "Play preview", exact: true })
      .click();
    await page.waitForFunction(
      () => document.querySelector("#narration").currentTime > 0.25,
    );
    let s = await playback(page);
    assert.ok(s.audioTime > 0);
    assert.ok(Math.abs(s.time - s.audioTime * 1000) < 150);
    await page
      .getByRole("button", { name: "Pause preview", exact: true })
      .click();
    await scrub(page, 1000);
    await page.waitForFunction(
      () =>
        Math.abs(document.querySelector("#narration").currentTime - 1) < 0.05,
    );
    s = await playback(page);
    assert.ok(Math.abs(s.time - 1000) < 50);
    assert.equal((await state(page)).quality.audioReviewed, false);
  }));
test("malformed project cannot replace the current document or execute input", async () =>
  withPage(async (page) => {
    const before = await state(page),
      bad = structuredClone(before);
    bad.assets.x = {
      name: "unsafe",
      mime: "image/png",
      width: 1,
      height: 1,
      data: "https://example.com/pixel.png",
    };
    await page.locator("#project-file").setInputFiles({
      name: "bad.json",
      mimeType: "application/json",
      buffer: Buffer.from(JSON.stringify(bad)),
    });
    await page.waitForFunction(() =>
      document.querySelector("#toast").textContent.includes("not opened"),
    );
    assert.equal((await state(page)).id, before.id);
    assert.equal(await page.locator("#dialog").isVisible(), false);
  }));
test("source fact editing rejects invented quotes and retains explicit origin flags", async () =>
  withPage(async (page) => {
    await blank(page);
    await page.locator('[data-tab="facts"]').click();
    await page.getByRole("button", { name: "Add source", exact: true }).click();
    await page.locator('input[name="title"]').fill("Original test text");
    await page
      .locator('textarea[name="excerpt"]')
      .fill("The blue lantern hangs over the door.");
    await page
      .getByRole("button", { name: "Save source", exact: true })
      .click();
    await page.getByRole("button", { name: "Add fact", exact: true }).click();
    await page
      .locator('textarea[name="text"]')
      .fill("A blue lantern hangs over the door.");
    await page.locator('textarea[name="quote"]').fill("An invented quote");
    await page.getByRole("button", { name: "Save fact", exact: true }).click();
    assert.equal(await page.locator("#dialog").isVisible(), true);
    assert.match(
      await page.locator("#dialog-error").textContent(),
      /exact substring/,
    );
    await page
      .locator('textarea[name="quote"]')
      .fill("The blue lantern hangs over the door.");
    await page.getByRole("button", { name: "Save fact", exact: true }).click();
    const p = await state(page);
    assert.equal(p.facts.length, 1);
    assert.equal(p.sources[0].userProvided, false);
    assert.equal(p.quality.sourceCoverageReviewed, false);
  }));
test("local recovery survives a reload with edited object geometry", async () =>
  withPage(async (page) => {
    await blank(page);
    await drawRect(page, 310, 220, 250, 170);
    const expected = await state(page);
    await page.waitForFunction(
      () => document.querySelector("#save-status").dataset.status === "saved",
    );
    await page.reload();
    await page.waitForFunction(() =>
      document.querySelector("#save-status").textContent.includes("Recovered"),
    );
    const p = await state(page);
    assert.equal(p.id, expected.id);
    assert.deepEqual(p.nodes, expected.nodes);
  }));
test("SVG export contains the artwork and no editor controls", async () =>
  withPage(async (page) => {
    await page
      .getByRole("button", { name: "Export", exact: false })
      .first()
      .click();
    const out = await downloaded(page, () =>
      page.getByRole("button", { name: /Vector scene/ }).click(),
    );
    const xml = out.bytes.toString();
    assert.ok(xml.startsWith("<svg"));
    assert.ok(xml.includes("WORKSHOP"));
    assert.ok(!xml.includes("selection-overlay"));
    assert.ok(!xml.includes("<script"));
  }));
test("local authoring server never serves repository documents or arbitrary paths", async () =>
  withPage(async (page) => {
    for (const path of [
      "/HANDOFF.md",
      "/.git/config",
      "/package-lock.json",
      "/src/../../HANDOFF.md",
    ]) {
      const response = await page.request.get(base + path);
      assert.equal(response.status(), 404, path);
    }
  }));

const exec = promisify(execFile);
async function agent(...args) {
  const result = await exec(
    process.execPath,
    [resolve(root, "agent.mjs"), ...args],
    {
      timeout: 45000,
      maxBuffer: 1024 * 1024,
    },
  );
  return JSON.parse(result.stdout);
}
const sha256 = (bytes) => createHash("sha256").update(bytes).digest("hex");
const asPng = (bytes) => "data:image/png;base64," + bytes.toString("base64");

test(
  "one complete image retains its pixels and fact hotspots through the lesson handoff",
  { timeout: 60000 },
  async () =>
    withPage(async (page) => {
      // Original neutral fixture, with transparent margins and a non-16:9 canvas.
      const data = await page.evaluate(() => {
        const canvas = document.createElement("canvas");
        canvas.width = 193;
        canvas.height = 129;
        const ctx = canvas.getContext("2d");
        ctx.fillStyle = "#447755";
        ctx.fillRect(11, 13, 100, 80);
        ctx.fillStyle = "#eeaa33";
        ctx.fillRect(150, 100, 43, 29);
        return canvas.toDataURL("image/png");
      });
      const image = resolve(temp, "complete-scene.png"),
        input = resolve(temp, "single-image.json"),
        ops = resolve(temp, "hotspots.json"),
        patched = resolve(temp, "single-image-linked.json"),
        dir = resolve(temp, "single-image-handoff");
      await writeFile(image, Buffer.from(data.split(",")[1], "base64"));
      const created = await agent(
        "new",
        "--image",
        image,
        "--title",
        "One scene",
        "--id",
        "one-scene",
        "--out",
        input,
      );
      const p = JSON.parse(await readFile(input, "utf8"));
      assert.deepEqual([p.width, p.height], [193, 129]);
      assert.equal(p.background, "none");
      assert.equal(p.nodes.length, 1);
      assert.equal(Object.keys(p.assets).length, 1);
      assert.deepEqual(p.nodes[0].matrix, [1, 0, 0, 1, 0, 0]);
      assert.equal(p.nodes[0].role, "background");
      assert.equal(p.nodes[0].locked, true);
      assert.equal(created.hasTransparency, true);
      assert.equal(p.assets[created.assetId].data, data);
      const text = "The green rectangle is beside the amber rectangle.";
      const track = (mode) => ({
        durationMs: 90000,
        audioAssetId: null,
        cues: [
          {
            id: mode + "-cue",
            startMs: 0,
            endMs: 90000,
            text,
            factIds: ["green-fact"],
            layerIds: ["green-hotspot"],
            camera: { x: 0, y: 0, width: 1, height: 1 },
            easing: "EASE_IN_OUT",
          },
        ],
      });
      await writeFile(
        ops,
        JSON.stringify([
          {
            op: "add-source",
            source: {
              id: "original",
              title: "Original neutral fixture",
              sha256: sha256(text),
              userProvided: false,
              excerpts: { scene: text },
            },
          },
          {
            op: "add-fact",
            fact: {
              id: "green-fact",
              text,
              sources: [
                { sourceId: "original", locator: "scene", quote: text },
              ],
            },
          },
          {
            op: "add-layer",
            layer: {
              id: "green-hotspot",
              type: "rect",
              name: "Green rectangle",
              width: 100,
              height: 80,
              matrix: [1, 0, 0, 1, 11, 13],
              visible: true,
              fill: "none",
              stroke: "none",
              factIds: ["green-fact"],
            },
          },
          ...["explanation", "story"].map((mode) => ({
            op: "set-track",
            mode,
            track: track(mode),
          })),
        ]),
      );
      await agent("patch", "--project", input, "--ops", ops, "--out", patched);
      await agent("handoff", "--project", patched, "--out-dir", dir);
      const draft = JSON.parse(
        await readFile(resolve(dir, "studio-handoff.json"), "utf8"),
      );
      assert.equal(draft.lesson.parts.length, 1);
      assert.equal(draft.lesson.symbols.length, 1);
      assert.deepEqual(draft.lesson.symbols[0].region, {
        x: 11 / 193,
        y: 13 / 129,
        width: 100 / 193,
        height: 80 / 129,
      });
      for (const mode of ["explanation", "story"])
        assert.deepEqual(
          draft.narrationPlan.parts[0].tracks[mode][0].symbolIds,
          ["green-hotspot"],
        );
      assert.equal(draft.lesson.quality.audioReviewed, false);
      assert.equal(draft.lesson.quality.sourceCoverageReviewed, false);
      const difference = await page.evaluate(
        async ({ original, rendered }) => {
          const pixels = async (src) => {
            const image = new Image();
            image.src = src;
            await image.decode();
            const canvas = document.createElement("canvas");
            canvas.width = image.naturalWidth;
            canvas.height = image.naturalHeight;
            const ctx = canvas.getContext("2d");
            ctx.drawImage(image, 0, 0);
            return ctx.getImageData(0, 0, canvas.width, canvas.height).data;
          };
          const a = await pixels(original),
            b = await pixels(rendered);
          return a.length === b.length
            ? a.reduce((n, value, i) => n + (value !== b[i]), 0)
            : -1;
        },
        {
          original: data,
          rendered: asPng(await readFile(resolve(dir, "images/scene.png"))),
        },
      );
      assert.equal(difference, 0);
    }),
);

test(
  "agent exports real transparent layers that recompose at the saved pixel coordinates",
  { timeout: 120000 },
  async () =>
    withPage(async (page) => {
      const input = resolve(temp, "layer-demo.json"),
        baseImage = resolve(temp, "base.png"),
        dir = resolve(temp, "layers");
      await agent("new", "--demo", "--out", input);
      await agent("render", "--project", input, "--out", baseImage);
      const report = await agent(
        "layers",
        "--project",
        input,
        "--out-dir",
        dir,
      );
      assert.equal(report.layers, 7);
      const manifest = JSON.parse(
        await readFile(resolve(dir, "layers.layer-assets.json"), "utf8"),
      );
      const background = await readFile(resolve(dir, manifest.background));
      assert.equal(sha256(background), manifest.backgroundSha256);
      const layers = [];
      for (const layer of manifest.layers) {
        const bytes = await readFile(resolve(dir, layer.file));
        assert.equal(sha256(bytes), layer.sha256);
        assert.ok(Object.values(layer.placement).every(Number.isInteger));
        layers.push({ ...layer, data: asPng(bytes) });
      }
      const metrics = await page.evaluate(
        async ({ original, background, layers }) => {
          const load = async (src) => {
            const im = new Image();
            im.src = src;
            await im.decode();
            return im;
          };
          const source = await load(original),
            back = await load(background);
          const canvas = document.createElement("canvas");
          canvas.width = source.naturalWidth;
          canvas.height = source.naturalHeight;
          const ctx = canvas.getContext("2d");
          ctx.drawImage(source, 0, 0);
          const expected = ctx.getImageData(
            0,
            0,
            canvas.width,
            canvas.height,
          ).data;
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(back, 0, 0);
          const alpha = [];
          for (const layer of layers) {
            const im = await load(layer.data),
              check = document.createElement("canvas");
            check.width = im.naturalWidth;
            check.height = im.naturalHeight;
            const c = check.getContext("2d");
            c.drawImage(im, 0, 0);
            const a = c.getImageData(0, 0, check.width, check.height).data;
            let transparent = false,
              painted = false;
            for (let i = 3; i < a.length; i += 4) {
              transparent ||= a[i] === 0;
              painted ||= a[i] > 0;
            }
            alpha.push({
              transparent,
              painted,
              width: check.width,
              height: check.height,
            });
            ctx.drawImage(im, layer.placement.x, layer.placement.y);
          }
          const actual = ctx.getImageData(
            0,
            0,
            canvas.width,
            canvas.height,
          ).data;
          let total = 0,
            max = 0;
          for (let i = 0; i < actual.length; i++) {
            const diff = Math.abs(actual[i] - expected[i]);
            total += diff;
            max = Math.max(max, diff);
          }
          return {
            mean: total / actual.length,
            max,
            alpha,
            width: canvas.width,
            height: canvas.height,
          };
        },
        {
          original: asPng(await readFile(baseImage)),
          background: asPng(background),
          layers,
        },
      );
      assert.deepEqual([metrics.width, metrics.height], [1600, 900]);
      metrics.alpha.forEach((a, i) => {
        assert.ok(a.transparent && a.painted, layers[i].name);
        assert.deepEqual(
          [a.width, a.height],
          [layers[i].placement.width, layers[i].placement.height],
        );
      });
      // Separate 8-bit alpha compositing may round by a few channel values.
      assert.ok(
        metrics.mean < 0.02 && metrics.max <= 6,
        JSON.stringify(metrics),
      );
      await mkdir(resolve(root, "test-results"), { recursive: true });
      await import("node:fs/promises").then((fs) =>
        fs.writeFile(
          resolve(root, "test-results/layer-recomposition.json"),
          JSON.stringify(metrics, null, 2),
        ),
      );
    }),
);

test(
  "agent frame rendering is deterministic and reduced motion retains the base pose",
  { timeout: 120000 },
  async () => {
    const input = resolve(temp, "frame-demo.json"),
      first = resolve(temp, "frame.png"),
      second = resolve(temp, "same-frame.png"),
      still = resolve(temp, "still.png"),
      baseImage = resolve(temp, "frame-base.png");
    await agent("new", "--demo", "--out", input);
    await agent(
      "render",
      "--project",
      input,
      "--out",
      first,
      "--mode",
      "story",
      "--time-ms",
      "45000",
    );
    await agent(
      "render",
      "--project",
      input,
      "--out",
      second,
      "--mode",
      "story",
      "--time-ms",
      "45000",
    );
    await agent(
      "render",
      "--project",
      input,
      "--out",
      still,
      "--mode",
      "story",
      "--time-ms",
      "45000",
      "--reduced-motion",
    );
    await agent("render", "--project", input, "--out", baseImage);
    assert.equal(sha256(await readFile(first)), sha256(await readFile(second)));
    assert.equal(
      sha256(await readFile(still)),
      sha256(await readFile(baseImage)),
    );
    assert.notEqual(
      sha256(await readFile(first)),
      sha256(await readFile(baseImage)),
    );
  },
);

test(
  "agent handoff writes actual PNG and source-preserving draft inputs without approval",
  { timeout: 60000 },
  async () => {
    const input = resolve(temp, "handoff-demo.json"),
      dir = resolve(temp, "production");
    await agent("new", "--demo", "--out", input);
    const report = await agent("handoff", "--project", input, "--out-dir", dir);
    assert.equal(report.releaseReady, false);
    const authoring = JSON.parse(
      await readFile(resolve(dir, "authoring.json"), "utf8"),
    );
    const plan = JSON.parse(
      await readFile(resolve(dir, "narration-plan.json"), "utf8"),
    );
    const draft = JSON.parse(
      await readFile(resolve(dir, "studio-handoff.json"), "utf8"),
    );
    assert.equal(authoring.lesson.quality.audioReviewed, false);
    assert.equal(authoring.lesson.quality.sourceCoverageReviewed, false);
    assert.equal(draft.releaseReady, false);
    const source = authoring.lesson.sources[0];
    for (const fact of authoring.lesson.facts)
      for (const ref of fact.sources)
        assert.ok(source.excerpts[ref.locator].includes(ref.quote));
    assert.deepEqual(Object.keys(plan.parts[0].tracks).sort(), [
      "explanation",
      "story",
    ]);
    const png = await readFile(authoring.imageFiles["images/scene.png"]);
    assert.deepEqual(
      [...png.subarray(0, 8)],
      [137, 80, 78, 71, 13, 10, 26, 10],
    );
    assert.equal(png.readUInt32BE(16), 1600);
    assert.equal(png.readUInt32BE(20), 900);
    assert.ok(!report.files.some((name) => name.endsWith(".zip")));
  },
);
