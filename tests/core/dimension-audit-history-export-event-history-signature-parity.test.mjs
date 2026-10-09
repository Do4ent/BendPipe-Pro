import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const domain=fs.readFileSync(path.join(root,"src","domain","measurements","audit-download.mjs"),"utf8");
const ui=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");

function signatureFields(source,startMarker,endMarker){
  const start=source.indexOf(startMarker);
  const end=source.indexOf(endMarker,start);
  assert.ok(start>=0&&end>start);
  const body=source.slice(start,end);
  return [...body.matchAll(/^\s+([a-z_]+):/gm)].map(match=>match[1]);
}

test("question 875: domain and UI fallback event-history signatures stay field-order compatible",()=>{
  const domainFields=signatureFields(
    domain,
    "export function dimensionAuditDownloadHistoryExportEventHistorySignature(",
    "export function dimensionAuditDownloadHistoryExportEventHistorySignatureValid("
  );
  const uiFields=signatureFields(
    ui,
    "function dimensionAuditDownloadHistoryExportEventHistorySignature(",
    "function dimensionAuditDownloadHistoryExportEventHistorySignatureValid("
  );
  assert.deepEqual(uiFields,domainFields);
  assert.deepEqual(domainFields,[
    "schema","event_count","event_signatures","summary_schema","summary_signature","summary_total",
    "summary_latest_signature","summary_latest_action","summary_latest_outcome","summary_latest_code",
    "events_valid","summary_valid","summary_signature_valid","signature_valid","generated_at"
  ]);
});
