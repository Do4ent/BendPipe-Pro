import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const ui=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");

test("question 247: Review queue button shows pending count and disables when empty",()=>{
  assert.match(ui,/Review queue \('\+auditSummary\.needs_review\+'\)/);
  assert.match(ui,/data-dimension-review-queue '\+\(auditSummary\.needs_review===0\?'disabled':''\)\+'/);
});
