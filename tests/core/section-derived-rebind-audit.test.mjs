import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const ui=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");

test("question 137: Rebind audit retains stale reason",()=>{
  assert.match(ui,/previous_stale_reason:dimension\?\.stale_reason\?\?null/);
});

test("question 137: Rebind audit retains stale Section View snapshot",()=>{
  assert.match(ui,/previous_stale_at_section_view:clone\(dimension\?\.stale_at_section_view\?\?null\)/);
});
