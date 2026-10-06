import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const ui=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");

test("question 136: already fully stale Section-derived dimensions are not rewritten",()=>{
  assert.match(ui,/const alreadyStale=String\(dimension\?\.status\?\?""\)==="Stale"/);
  assert.match(ui,/if\(alreadyStale&&dimension\?\.stale_reason&&dimension\?\.stale_at_section_view\)return dimension/);
});

test("question 136: first stale reason and Section snapshot are preserved",()=>{
  assert.match(ui,/stale_reason:dimension\?\.stale_reason\?\?String\(reason\)/);
  assert.match(ui,/stale_at_section_view:clone\(dimension\?\.stale_at_section_view\?\?/);
});
