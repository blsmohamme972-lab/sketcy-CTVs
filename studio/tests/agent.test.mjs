import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import {
  mkdtempSync,
  readFileSync,
  writeFileSync,
  existsSync,
  rmSync,
  symlinkSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
const studio = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const cli = (...args) =>
  spawnSync(process.execPath, [resolve(studio, "agent.mjs"), ...args], {
    encoding: "utf8",
  });
function fixture(run) {
  const dir = mkdtempSync(resolve(tmpdir(), "sketcy-studio-agent-"));
  try {
    return run(dir);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}
test("agent creates and validates a portable project without a browser", () =>
  fixture((dir) => {
    const path = resolve(dir, "scene.json"),
      created = cli(
        "new",
        "--title",
        "Agent scene",
        "--id",
        "repeatable-scene",
        "--out",
        path,
      );
    assert.equal(created.status, 0, created.stderr);
    const p = JSON.parse(readFileSync(path, "utf8"));
    assert.equal(p.title, "Agent scene");
    assert.equal(p.schema, "sketcy.studio.v1");
    assert.equal(p.id, "repeatable-scene");
    const checked = cli("validate", "--project", path);
    assert.equal(checked.status, 0, checked.stderr);
    assert.equal(JSON.parse(checked.stdout).valid, true);
  }));
test("agent refuses to put generated projects inside the repository", () => {
  const out = resolve(studio, "should-not-exist.sketcy-studio.json"),
    result = cli("new", "--out", out);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /outside the Git repository/);
  assert.equal(existsSync(out), false);
});
test("agent protects existing output unless force is explicit", () =>
  fixture((dir) => {
    const path = resolve(dir, "scene.json");
    assert.equal(cli("new", "--out", path).status, 0);
    const original = readFileSync(path, "utf8");
    const again = cli("new", "--title", "Overwrite", "--out", path);
    assert.equal(again.status, 1);
    assert.equal(readFileSync(path, "utf8"), original);
    assert.equal(
      cli("new", "--title", "Intentional replacement", "--out", path, "--force")
        .status,
      0,
    );
  }));
test("agent applies a complete operation batch only after validation", () =>
  fixture((dir) => {
    const input = resolve(dir, "scene.json"),
      ops = resolve(dir, "ops.json"),
      out = resolve(dir, "revised.json");
    cli("new", "--out", input);
    writeFileSync(
      ops,
      JSON.stringify([
        {
          op: "add-layer",
          layer: {
            id: "author-object",
            type: "rect",
            name: "Cue",
            matrix: [1, 0, 0, 1, 100, 200],
          },
        },
        {
          op: "update-layer",
          id: "author-object",
          changes: { fill: "#447755" },
        },
      ]),
    );
    const result = cli("patch", "--project", input, "--ops", ops, "--out", out);
    assert.equal(result.status, 0, result.stderr);
    const p = JSON.parse(readFileSync(out, "utf8"));
    assert.equal(p.nodes[0].fill, "#447755");
    assert.equal(p.nodes[0].matrix[4], 100);
    assert.equal(JSON.parse(readFileSync(input, "utf8")).nodes.length, 0);
  }));
test("failed agent operations do not create an output or mutate the input", () =>
  fixture((dir) => {
    const input = resolve(dir, "scene.json"),
      ops = resolve(dir, "ops.json"),
      out = resolve(dir, "rejected.json");
    cli("new", "--out", input);
    const original = readFileSync(input, "utf8");
    writeFileSync(ops, JSON.stringify([{ op: "unknown-operation" }]));
    assert.equal(
      cli("patch", "--project", input, "--ops", ops, "--out", out).status,
      1,
    );
    assert.equal(existsSync(out), false);
    assert.equal(readFileSync(input, "utf8"), original);
  }));
test("agent SVG render is usable without installing a browser", () =>
  fixture((dir) => {
    const input = resolve(dir, "scene.json"),
      out = resolve(dir, "scene.svg");
    assert.equal(cli("new", "--demo", "--out", input).status, 0);
    const rendered = cli("render", "--project", input, "--out", out);
    assert.equal(rendered.status, 0, rendered.stderr);
    assert.match(readFileSync(out, "utf8"), /^<svg/);
    assert.ok(readFileSync(out, "utf8").includes("WORKSHOP"));
  }));
test("output guard resolves symlinked parent folders", () =>
  fixture((dir) => {
    const alias = resolve(dir, "repository");
    symlinkSync(studio, alias, "dir");
    const result = cli("new", "--out", resolve(alias, "should-not-exist.json"));
    assert.equal(result.status, 1);
    assert.match(result.stderr, /outside the Git repository/);
  }));
