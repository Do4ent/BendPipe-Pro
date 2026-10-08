import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const ui=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");

test("question 821: history download records final download permit evidence",()=>{
  const fn=ui.match(/function downloadDimensionAuditDownloadHistory\(\)\{([\s\S]*?)\n  \}/)?.[1]??"";
  assert.match(fn,/export_action:"download"/);
  assert.match(fn,/action_permit_signature:exportActionPermitSignature/);
  assert.match(fn,/action_permit_snapshot_signature:exportActionPermitSnapshot\.snapshot_signature/);
  assert.match(fn,/downloadDimensionAuditJsonWithPermitEvidence\(dimensionAuditJsonFilename\(stem,snapshot\.generated_at\),snapshot,\{/);
});
