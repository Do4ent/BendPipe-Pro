import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const ui=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");

test("question 469: Saved Dimensions rows have review context health styling",()=>{
  assert.match(ui,/data-review-context-health="ready"/);
  assert.match(ui,/data-review-context-health="pending"/);
  assert.match(ui,/data-review-context-health="diagnostics-error"/);
  assert.match(ui,/border-left:3px solid/);
});
