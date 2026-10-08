import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const ui=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");

test("question 475: visible audit filename includes bounded search context when active",()=>{
  assert.match(ui,/const searchValue=String\(snapshot\?\.view\?\.search\?\?""\)\.trim\(\)/);
  assert.match(ui,/const searchName=searchValue\?"-search-"\+dimensionAuditFilenamePart\(searchValue,"query",40\):""/);
  assert.match(ui,/dimension-audit-view-"\+filterName\+"-"\+sortName\+searchName\+focusName\+"-"\+snapshot\.dimension_count\+"-"/);
});
