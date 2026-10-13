import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const ui=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");

test("questions 980-983: UI action status and snapshot validators require canonical types",()=>{
  assert.match(ui,/typeof value\.payload_binding_snapshot_valid!=="boolean"/);
  assert.match(ui,/typeof value\.payload_binding_snapshot_signature!=="string"/);
  assert.match(ui,/typeof value\.status_signature!=="string"/);
  assert.match(ui,/typeof value\.snapshot_signature!=="string"/);
});
