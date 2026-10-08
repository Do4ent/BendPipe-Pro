import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const ui=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");

test("question 715: history readiness protocol has deterministic signature",()=>{
  const fn=ui.match(/function dimensionAuditDownloadHistoryExportReadinessProtocolSignature\(protocol=dimensionAuditDownloadHistoryExportReadinessProtocol\(\)\)\{([\s\S]*?)\n  \}/)?.[1]??"";
  assert.match(fn,/schema:String\(value\.schema\?\?""\)/);
  assert.match(fn,/state_schema:String\(value\.state_schema\?\?""\)/);
  assert.match(fn,/snapshot_schema:String\(value\.snapshot_schema\?\?""\)/);
  assert.match(fn,/codes:\[\.\.\.\(value\.codes\?\?\[\]\)\]\.map\(code=>String\(code\)\)/);
  assert.match(ui,/currentDimensionAuditDownloadHistoryExportReadinessProtocolSignature:\(\)=>dimensionAuditDownloadHistoryExportReadinessProtocolSignature\(\)/);
});
