import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const ui=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");

test("questions 968-971: UI authorization and snapshot validators require canonical types",()=>{
  assert.match(ui,/typeof value\.decision_snapshot_valid!=="boolean"/);
  assert.match(ui,/typeof value\.decision_code!=="string"/);
  assert.match(ui,/typeof value\.authorization_signature!=="string"/);
  assert.match(ui,/typeof value\.snapshot_signature!=="string"/);
});
