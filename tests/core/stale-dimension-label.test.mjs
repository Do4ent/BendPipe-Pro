import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const runtime = fs.readFileSync(path.join(root, "src", "ui", "dimension-grips-runtime.js"), "utf8");

test("question 118: stale 3D dimension labels use explicit marker text", () => {
  assert.match(runtime, /function dimensionLabelText\(dimension\)/);
  assert.match(runtime, /staleDimension\(dimension\).*value:value/);
});

test("question 118: dimension label metadata exposes stale status and reason", () => {
  assert.match(runtime, /dimensionStatus:String\(dimension\?\.status/);
  assert.match(runtime, /staleReason:staleDimension\(dimension\)/);
});

test("question 118: label text helper is exposed for UI integration", () => {
  assert.match(runtime, /dimensionLabelText,openEditor/);
});
