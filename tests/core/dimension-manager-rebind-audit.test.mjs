import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const ui=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");

test("question 142: Saved Dimensions exposes expandable Rebind audit",()=>{
  assert.match(ui,/function dimensionRebindAuditHtml\(dimension\)/);
  assert.match(ui,/data-dim-rebind-audit=/);
  assert.match(ui,/Rebind audit · /);
});

test("question 142: Rebind audit shows previous source value reason and new reference signatures",()=>{
  assert.match(ui,/previous_references/);
  assert.match(ui,/previous_value/);
  assert.match(ui,/previous_stale_reason/);
  assert.match(ui,/new_reference_signatures/);
  assert.match(ui,/New refs:/);
});
