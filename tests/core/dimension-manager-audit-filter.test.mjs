import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const ui=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");

test("question 147: Saved Dimensions supports All Stale Rebound filters",()=>{
  assert.match(ui,/dimensionManagerFilter="all"/);
  assert.match(ui,/function filteredDimensionManagerItems\(items=savedDimensions\(\)\)/);
  assert.match(ui,/dimensionManagerFilter==="stale"/);
  assert.match(ui,/dimensionManagerFilter==="rebound"/);
  assert.match(ui,/data-dimension-filter=/);
});

test("question 147: audit summary stays project-wide while list is filtered",()=>{
  assert.match(ui,/const auditSummary=dimensionAuditSummary\(items\)/);
  assert.match(ui,/const visibleItems=filteredDimensionManagerItems\(items\)/);
  assert.match(ui,/Нет размеров для выбранного audit-фильтра/);
});
