import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const ui=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");

test("question 320: Saved Dimensions shows compact review progress status",()=>{
  assert.match(ui,/const reviewReasonProgressStatus=reviewReasonEntries\.length===0\?"empty":reviewReasonDiagnosticsValid\?"ok":"error"/);
  assert.match(ui,/status '\+reviewReasonProgressStatus/);
});
