import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const ui=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");

test("question 613: audit history copy and download gate on protocol state",()=>{
  const verification=ui.match(/function dimensionAuditDownloadHistoryVerification\(snapshot=\{\}\)\{([\s\S]*?)\n  \}/)?.[1]??"";
  assert.match(verification,/const bindingValid=dimensionAuditDownloadHistoryProtocolBindingValid\(value\)/);
  assert.match(verification,/!bindingValid\?"INVALID_PROTOCOL_BINDING":null/);
  const gate=/const verification=dimensionAuditDownloadHistoryVerification\(snapshot\);/g;
  assert.equal((ui.match(gate)??[]).length,2);
});
