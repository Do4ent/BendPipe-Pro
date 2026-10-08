import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  buildDimensionAuditDownloadAttempt,
  dimensionAuditDownloadAttemptSignature,
  dimensionAuditDownloadAttemptValid
} from "../../src/domain/measurements/audit-download.mjs";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const ui=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");

test("question 672: audit attempt validity rejects invalid generated_at semantics",()=>{
  const attempt=buildDimensionAuditDownloadAttempt({
    status:"downloaded",
    filename:"audit.json",
    generated_at:"2026-10-08T10:00:00Z"
  });
  assert.equal(dimensionAuditDownloadAttemptValid(attempt),true);
  const bad={...attempt,generated_at:"not-a-date"};
  const resigned={...bad,signature:dimensionAuditDownloadAttemptSignature(bad)};
  assert.equal(dimensionAuditDownloadAttemptValid(resigned),false);

  const fn=ui.match(/function dimensionAuditDownloadAttemptValid\(attempt\)\{([\s\S]*?)\n  \}/)?.[1]??"";
  assert.match(fn,/const timestamp=new Date\(String\(value\.generated_at\?\?""\)\)/);
  assert.match(fn,/const generatedAtValid=!Number\.isNaN\(timestamp\.getTime\(\)\)/);
  assert.match(fn,/&&generatedAtValid/);
});
