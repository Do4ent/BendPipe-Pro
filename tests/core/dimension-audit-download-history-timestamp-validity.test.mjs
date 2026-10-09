import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  dimensionAuditDownloadHistorySnapshot,
  dimensionAuditDownloadHistoryIntegrity,
  dimensionAuditDownloadHistorySignature
} from "../../src/domain/measurements/audit-download.mjs";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const ui=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");

test("question 673: audit history integrity validates generated_at semantics",()=>{
  const snapshot=dimensionAuditDownloadHistorySnapshot({
    project_id:"p1",
    project_name:"Project",
    generated_at:"2026-10-08T10:00:00Z",
    attempts:[]
  });
  assert.equal(dimensionAuditDownloadHistoryIntegrity(snapshot).generated_at_valid,true);

  const malformed={...snapshot,generated_at:"not-a-date"};
  const resigned={...malformed,snapshot_signature:dimensionAuditDownloadHistorySignature(malformed)};
  const integrity=dimensionAuditDownloadHistoryIntegrity(resigned);
  assert.equal(integrity.valid,false);
  assert.equal(integrity.generated_at_valid,false);
  assert.ok(integrity.errors.includes("INVALID_GENERATED_AT"));

  const fn=ui.match(/function dimensionAuditDownloadAttemptHistoryIntegrity\(snapshot\)\{([\s\S]*?)\n  \}/)?.[1]??"";
  assert.match(fn,/const generatedAtValid=value\.generated_at==null\|\|\(/);
  assert.match(fn,/typeof value\.generated_at==="string"/);
  assert.match(fn,/date\.toISOString\(\)===value\.generated_at/);
  assert.match(fn,/!generatedAtValid\?"INVALID_GENERATED_AT":null/);
  assert.match(fn,/generated_at_valid:generatedAtValid/);
});
