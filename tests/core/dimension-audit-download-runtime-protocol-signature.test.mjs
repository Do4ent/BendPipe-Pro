import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const ui=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");

test("question 519: audit download runtime signature includes protocol signature",()=>{
  const fn=ui.match(/function dimensionAuditDownloadRuntimeSignature\(state=dimensionAuditDownloadRuntimeState\(\)\)\{([\s\S]*?)\n  \}/)?.[1]??"";
  assert.match(fn,/protocol_signature:String\(value\.protocol_signature\?\?""\)/);
});
