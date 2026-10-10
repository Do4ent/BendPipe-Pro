import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const ui=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");

test("questions 960-963: UI gate and gate snapshot validators require canonical types",()=>{
  assert.match(ui,/typeof value\.allowed!=="boolean"/);
  assert.match(ui,/typeof value\.readiness_code!=="string"/);
  assert.match(ui,/if\(typeof signature!=="string"\|\|signature\.length===0\)return false;/);
  assert.match(ui,/typeof value\.gate_signature!=="string"/);
  assert.match(ui,/typeof value\.snapshot_signature!=="string"/);
});
