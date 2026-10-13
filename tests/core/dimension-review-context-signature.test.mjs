import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const ui=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");

test("question 451: canonical Dimension review context has deterministic signature",()=>{
  assert.match(ui,/function dimensionReviewContextSignature\(context=\{\}\)/);
  assert.match(ui,/diagnostics_signature:String\(value\.diagnostics_runtime\?\.signature\?\?""\)/);
  assert.match(ui,/diagnostics_integrity_signature:String\(value\.diagnostics_integrity\?\.signature\?\?""\)/);
  assert.match(ui,/return \{\.\.\.context,signature:dimensionReviewContextSignature\(context\)\}/);
});
