import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const ui=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");

test("questions 976-979: UI payload binding and snapshot validators require canonical types",()=>{
  assert.match(ui,/!Number\.isInteger\(value\.attempt_count\)/);
  assert.match(ui,/typeof value\.history_snapshot_signature!=="string"/);
  assert.match(ui,/typeof value\.history_signature_matches_chain!=="boolean"/);
  assert.match(ui,/typeof value\.binding_signature!=="string"/);
  assert.match(ui,/typeof value\.snapshot_signature!=="string"/);
});
