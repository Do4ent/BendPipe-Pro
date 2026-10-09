import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const ui=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");

test("question 1032: copy event-log enforces final-state evidence summary snapshot",()=>{
  const fn=ui.match(/async function copyDimensionAuditHistoryExportEvents\(\)\{([\s\S]*?)\n  \}/)?.[1]??"";
  assert.match(fn,/const events=dimensionAuditDownloadHistoryExportEventListSnapshot\(\)/);
  assert.match(fn,/const evidenceSummary=dimensionAuditDownloadHistoryExportEventFinalStateEvidenceSummary\(events\)/);
  assert.match(fn,/const evidenceSummarySnapshot=dimensionAuditDownloadHistoryExportEventFinalStateEvidenceSummarySnapshot\(evidenceSummary,events\)/);
  assert.match(fn,/dimensionAuditDownloadHistoryExportEventFinalStateEvidenceSummarySnapshotValid\(evidenceSummarySnapshot,events\)/);
});

test("question 1033: download event-log enforces final-state evidence summary snapshot",()=>{
  const fn=ui.match(/function downloadDimensionAuditHistoryExportEvents\(\)\{([\s\S]*?)\n  \}/)?.[1]??"";
  assert.match(fn,/const events=dimensionAuditDownloadHistoryExportEventListSnapshot\(\)/);
  assert.match(fn,/const evidenceSummary=dimensionAuditDownloadHistoryExportEventFinalStateEvidenceSummary\(events\)/);
  assert.match(fn,/const evidenceSummarySnapshot=dimensionAuditDownloadHistoryExportEventFinalStateEvidenceSummarySnapshot\(evidenceSummary,events\)/);
  assert.match(fn,/dimensionAuditDownloadHistoryExportEventFinalStateEvidenceSummarySnapshotValid\(evidenceSummarySnapshot,events\)/);
});
