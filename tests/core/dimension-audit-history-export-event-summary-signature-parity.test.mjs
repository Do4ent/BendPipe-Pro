import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const domain=fs.readFileSync(path.join(root,"src","domain","measurements","audit-download.mjs"),"utf8");
const ui=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");

function signatureFields(source,marker,nextMarker){
  const start=source.indexOf(marker);
  const end=source.indexOf(nextMarker,start);
  assert.ok(start>=0&&end>start);
  const body=source.slice(start,end);
  return [...body.matchAll(/^\s{4}([a-z_]+):/gm)].map(match=>match[1]);
}

test("question 866: domain and UI fallback export-event summary signatures stay field-order compatible",()=>{
  const domainFields=signatureFields(
    domain,
    "export function dimensionAuditDownloadHistoryExportEventSummarySignature(",
    "export function dimensionAuditDownloadHistoryExportEventSummary("
  );
  const uiFields=signatureFields(
    ui,
    "function dimensionAuditDownloadHistoryExportEventSummarySignature(",
    "function dimensionAuditDownloadHistoryExportEventSummary("
  );
  assert.deepEqual(uiFields,domainFields);
  assert.deepEqual(domainFields,[
    "schema","total","blocked","copied","downloaded","failed","copy","download",
    "valid","invalid","latest_signature","latest_outcome","latest_action","latest_code"
  ]);
});
