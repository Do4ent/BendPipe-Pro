import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const ui=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");

test("question 920: stored audit download attempts are frozen before entering history",()=>{
  const matches=[...ui.matchAll(/Object\.freeze\(attempt\);\s*lastDimensionAuditDownloadAttempt=attempt;\s*dimensionAuditDownloadAttemptHistory\.push\(attempt\)/g)];
  assert.equal(matches.length,2);
});
