import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  buildDimensionAuditDownloadHistoryExportEvent,
  dimensionAuditDownloadHistoryExportEventSummary
} from "../../src/domain/measurements/audit-download.mjs";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const ui=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");

test("question 887: export-event summary is immutable in domain and UI fallback",()=>{
  const event=buildDimensionAuditDownloadHistoryExportEvent({
    action:"copy",
    outcome:"blocked",
    code:"EMPTY",
    history_snapshot_signature:"history-signature",
    generated_at:"2026-10-09T00:00:00.000Z"
  });
  const summary=dimensionAuditDownloadHistoryExportEventSummary([event]);
  assert.equal(Object.isFrozen(summary),true);
  assert.match(ui,/return Object\.freeze\(\{\.\.\.base,signature:dimensionAuditDownloadHistoryExportEventSummarySignature\(base\)\}\)/);
});
