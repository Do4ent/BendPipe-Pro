import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const ui=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");

test("question 521: audit download runtime validation is versioned and signed",()=>{
  const fn=ui.match(/function dimensionAuditDownloadRuntimeValidation\(\)\{([\s\S]*?)\n  \}/)?.[1]??"";
  assert.match(fn,/schema:"TubeBender\.DimensionAuditDownloadRuntimeValidation\.v1"/);
  assert.match(fn,/code:state\.valid===true\?"OK":"INVALID_RUNTIME_PROTOCOL"/);
  assert.match(fn,/runtime_signature:dimensionAuditDownloadRuntimeSignature\(state\)/);
  assert.match(fn,/protocol_signature:String\(state\.protocol_signature\?\?""\)/);
});
