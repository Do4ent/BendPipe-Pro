import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const ui=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");

test("question 293: Saved Dimensions shows review reason completion state",()=>{
  assert.match(ui,/const reviewReasonCompletionState=reviewReasonEntries\.length===0\?"empty":reviewReasonPendingCount===0\?"complete":"pending"/);
  assert.match(ui,/state '\+reviewReasonCompletionState/);
});
