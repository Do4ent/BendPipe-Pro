import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const ui=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");

test("question 555: audit download history export fails closed on invalid integrity",()=>{
  const verification=ui.match(/function dimensionAuditDownloadHistoryVerification\(snapshot=\{\}\)\{([\s\S]*?)\n  \}/)?.[1]??"";
  assert.match(verification,/const integrity=dimensionAuditDownloadAttemptHistoryIntegrity\(value\)/);
  assert.match(verification,/!integrity\.valid\?"INVALID_INTEGRITY":null/);
  assert.match(ui,/function dimensionAuditDownloadHistoryExportReadiness/);
  assert.match(ui,/if\(!verification\.valid\)return \{ready:false,code:"VERIFICATION_FAILED"\}/);
});
