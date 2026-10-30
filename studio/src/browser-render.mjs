// Optional authoring-computer renderer. This module is never imported by Android
// or by the browser UI. Projects stay inside a fresh local browser context.
import { spawn } from "node:child_process";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

export async function withRenderer(project, run) {
  const { chromium } = await import("playwright");
  const server = spawn("python3", [resolve(root, "server.py"), "--port", "0"], {
    stdio: ["ignore", "pipe", "pipe"],
  });
  let browser;
  try {
    const url = await new Promise((yes, no) => {
      const timer = setTimeout(
        () => no(new Error("Studio renderer server did not start.")),
        10000,
      );
      let output = "";
      server.stdout.on("data", (data) => {
        output += String(data);
        const match = output.match(/http:\/\/127\.0\.0\.1:\d+/);
        if (match) {
          clearTimeout(timer);
          yes(match[0]);
        }
      });
      server.on("error", (e) => {
        clearTimeout(timer);
        no(e);
      });
      server.on("exit", (code) => {
        if (code) {
          clearTimeout(timer);
          no(new Error(`Renderer server exited ${code}.`));
        }
      });
    });
    browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
      viewport: { width: 1540, height: 1000 },
      acceptDownloads: true,
    });
    await context.route("**/*", (route) =>
      route
        .request()
        .url()
        .startsWith(url + "/")
        ? route.continue()
        : route.abort(),
    );
    const page = await context.newPage();
    await page.goto(url);
    await page.waitForSelector("[data-node]");
    if (project)
      await page.evaluate(async (p) => {
        const { validateProject } = await import("/src/model.mjs");
        const { verifyAssets } = await import("/src/assets.mjs");
        validateProject(p);
        await verifyAssets(p);
        globalThis.agentDocument = p;
      }, project);
    const api = {
      async selectionBox(nodeId) {
        return page.evaluate(async (id) => {
          const { selectionBox } = await import("/src/export.mjs");
          const p = globalThis.agentDocument;
          return selectionBox(p, [p.nodes.find((n) => n.id === id)]);
        }, nodeId);
      },
      async inspectImage(data) {
        return page.evaluate(
          async (data) => (await import("/src/assets.mjs")).inspectImage(data),
          data,
        );
      },
      async png(path, options = {}) {
        const pending = page.waitForEvent("download");
        await page.evaluate(async (options) => {
          const { pngBlob, download } = await import("/src/export.mjs");
          const project = globalThis.agentDocument;
          download(await pngBlob(project, options), "scene.png");
        }, options);
        await (await pending).saveAs(path);
      },
      async selectionPng(path, nodeId, box) {
        const pending = page.waitForEvent("download");
        await page.evaluate(
          async ({ nodeId, box }) => {
            const { pngBlob, download } = await import("/src/export.mjs");
            const node = globalThis.agentDocument.nodes.find(
              (n) => n.id === nodeId,
            );
            if (!node) throw new Error("Layer not found.");
            download(
              await pngBlob(globalThis.agentDocument, {
                nodes: [node],
                box,
                background: false,
              }),
              "layer.png",
            );
          },
          { nodeId, box },
        );
        await (await pending).saveAs(path);
      },
      async backgroundPng(path) {
        const pending = page.waitForEvent("download");
        await page.evaluate(async () => {
          const { pngBlob, download } = await import("/src/export.mjs");
          const p = globalThis.agentDocument;
          download(
            await pngBlob({
              ...p,
              nodes: p.nodes.filter((n) => n.role === "background"),
            }),
            "background.png",
          );
        });
        await (await pending).saveAs(path);
      },
    };
    return await run(api);
  } finally {
    await browser?.close();
    server.kill("SIGTERM");
  }
}
