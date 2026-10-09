import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const ui=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");

test("questions 956-959: UI readiness state and snapshot validators require canonical types",()=>{
  assert.match(ui,/typeof value\.ready==="boolean"/);
  assert.match(ui,/typeof value\.code==="string"/);
  assert.match(ui,/!Number\.isInteger\(current\.attempt_count\)/);
  assert.match(ui,/typeof current\.snapshot_signature!=="string"/);
  assert.match(ui,/current\.protocol_signature===expected\.protocol_signature/);
  assert.match(ui,/current\.snapshot_signature===expected\.snapshot_signature/);
});
