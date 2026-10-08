import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const ui=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");

test("question 587: copy and download require valid audit history envelope",()=>{
  const verification=ui.match(/function dimensionAuditDownloadHistoryVerification\(snapshot=\{\}\)\{([\s\S]*?)\n  \}/)?.[1]??"";
  assert.match(verification,/const envelopeValid=dimensionAuditDownloadAttemptHistoryEnvelopeValid\(value\)/);
  assert.match(verification,/!envelopeValid\?"INVALID_ENVELOPE":null/);
  const gate=/const verification=dimensionAuditDownloadHistoryVerification\(snapshot\);\s*if\(!verification\.valid\)/g;
  assert.equal((ui.match(gate)??[]).length,2);
});
