import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const ui=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");

test("question 715: history readiness protocol has deterministic canonical signature",()=>{
  const fn=ui.match(/function dimensionAuditDownloadHistoryExportReadinessProtocolSignature\(protocol=dimensionAuditDownloadHistoryExportReadinessProtocol\(\)\)\{([\s\S]*?)\n  \}/)?.[1]??"";
  assert.match(fn,/typeof value\.schema!=="string"/);
  assert.match(fn,/typeof value\.state_schema!=="string"/);
  assert.match(fn,/typeof value\.snapshot_schema!=="string"/);
  assert.match(fn,/!Array\.isArray\(value\.codes\)/);
  assert.match(fn,/!value\.codes\.every\(code=>typeof code==="string"\)/);
  assert.match(fn,/schema:value\.schema/);
  assert.match(fn,/state_schema:value\.state_schema/);
  assert.match(fn,/snapshot_schema:value\.snapshot_schema/);
  assert.match(fn,/codes:\[\.\.\.value\.codes\]/);
  assert.match(ui,/currentDimensionAuditDownloadHistoryExportReadinessProtocolSignature:\(\)=>dimensionAuditDownloadHistoryExportReadinessProtocolSignature\(\)/);
});

test("question 1219: readiness protocol UI signature fallback no longer coerces signed fields",()=>{
  const fn=ui.match(/function dimensionAuditDownloadHistoryExportReadinessProtocolSignature\(protocol=dimensionAuditDownloadHistoryExportReadinessProtocol\(\)\)\{([\s\S]*?)\n  \}/)?.[1]??"";
  assert.doesNotMatch(fn,/String\(value\./);
  assert.doesNotMatch(fn,/map\(code=>String\(code\)\)/);
});
