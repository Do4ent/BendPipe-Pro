import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const ui=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");

test("question 549: audit download history can be copied as JSON",()=>{
  const fn=ui.match(/async function copyDimensionAuditDownloadHistory\(\)\{([\s\S]*?)\n  \}/)?.[1]??"";
  assert.match(fn,/const snapshot=dimensionAuditDownloadAttemptHistoryAuditSnapshot\(\)/);
  assert.match(fn,/const readiness=dimensionAuditDownloadHistoryExportReadiness\(snapshot\)/);
  assert.match(fn,/if\(!readiness\.ready\)/);
  assert.match(fn,/JSON\.stringify\(snapshot,null,2\)/);
  assert.match(fn,/navigator\?\.clipboard\?\.writeText/);
});
