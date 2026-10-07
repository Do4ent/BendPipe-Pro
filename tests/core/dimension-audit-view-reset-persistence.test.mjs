import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const ui=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");

test("question 245: Reset view clears persisted project audit state",()=>{
  assert.match(ui,/function clearPersistedDimensionAuditViewState\(\)/);
  assert.match(ui,/sessionStorage\.removeItem\(dimensionAuditViewStorageKey\(projectId\)\)/);
  assert.match(ui,/dimensionManagerFilter="all";dimensionManagerSort="project";dimensionManagerSearch="";dimensionManagerFocusId="";render\(\);\n      clearPersistedDimensionAuditViewState\(\)/);
});
