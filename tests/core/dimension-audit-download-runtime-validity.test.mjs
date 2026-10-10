import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const ui=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");

test("question 510: audit download runtime state exposes combined validity",()=>{
  const fn=ui.match(/function dimensionAuditDownloadRuntimeState\(\)\{([\s\S]*?)\n  \}/)?.[1]??"";
  assert.match(fn,/const policyConsistent=dimensionAuditDownloadPolicyConsistent\(\)/);
  assert.match(fn,/const protocolConsistent=protocolState\?\.protocol_consistent===true\|\|\(!protocolState&&dimensionAuditDownloadProtocolConsistent\(\)\)/);
  assert.match(fn,/valid:policyConsistent&&protocolConsistent/);
});
