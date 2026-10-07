import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const ui=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");

test("question 145: project Dimension audit exposes summary counters",()=>{
  assert.match(ui,/function dimensionAuditSummary\(items=savedDimensions\(\)\)/);
  assert.match(ui,/total:items\.length/);
  assert.match(ui,/stale:0,rebound:0,section_derived:0,visible:0,hidden:0/);
  assert.match(ui,/by_status:\{\},by_mode:\{\},by_geometry_status:\{\}/);
  assert.match(ui,/summary\.by_status\[status\]/);
  assert.match(ui,/summary\.by_mode\[mode\]/);
  assert.match(ui,/if\(status==="Stale"\)summary\.stale\+\+/);
  assert.match(ui,/if\(dimension\?\.rebound_from_stale===true\)summary\.rebound\+\+/);
});

test("question 145: project-wide snapshot includes the computed summary",()=>{
  assert.match(ui,/summary:dimensionAuditSummary\(items\)/);
});
