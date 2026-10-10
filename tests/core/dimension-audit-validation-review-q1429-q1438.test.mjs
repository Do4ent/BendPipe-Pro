import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const ui=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");

test("question 1429: download validation-schema helper remains publicly exposed",()=>{
  assert.match(ui,/dimensionAuditDownloadValidationSchema,dimensionAuditDownloadValidationCodes/);
});

test("question 1430: download validation-codes helper remains publicly exposed",()=>{
  assert.match(ui,/dimensionAuditDownloadValidationCodes,dimensionAuditDownloadSchemas/);
});

test("question 1431: download schemas helper remains publicly exposed",()=>{
  assert.match(ui,/dimensionAuditDownloadSchemas,dimensionAuditDownloadSnapshotShapeSupported/);
});

test("question 1432: download snapshot-shape support helper remains publicly exposed",()=>{
  assert.match(ui,/dimensionAuditDownloadSnapshotShapeSupported,dimensionAuditDownloadFilenameSupported/);
});

test("question 1433: download filename support helper remains publicly exposed",()=>{
  assert.match(ui,/dimensionAuditDownloadFilenameSupported,dimensionAuditDownloadSchemaSupported/);
});

test("question 1434: download schema support helper remains publicly exposed",()=>{
  assert.match(ui,/dimensionAuditDownloadSchemaSupported,dimensionAuditDownloadValidation/);
});

test("question 1435: download validation helper remains publicly exposed",()=>{
  assert.match(ui,/dimensionAuditDownloadValidation,downloadVisibleDimensionAudits/);
});

test("question 1436: visible and all dimension-audit download actions remain publicly exposed",()=>{
  assert.match(ui,/downloadVisibleDimensionAudits,downloadAllDimensionAudits/);
});

test("question 1437: dimension-audit geometry classifier remains publicly exposed",()=>{
  assert.match(ui,/downloadAllDimensionAudits,dimensionAuditGeometryClass/);
});

test("question 1438: review-progress entry points remain publicly exposed",()=>{
  assert.match(ui,/dimensionReviewProgress,domainDimensionReviewProgress,canonicalDimensionReviewProgress/);
});
