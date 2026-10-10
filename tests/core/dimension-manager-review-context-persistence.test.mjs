import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const ui=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");

test("question 472: persisted audit view accepts review context filters and sort",()=>{
  assert.match(ui,/const filters=\["all","selected","unselected","needs-review","review-action","review-ready","review-pending","review-diagnostics-error","review-not-required"/);
  assert.match(ui,/\["project","audit","review-context"\]\.includes\(String\(state\?\.sort\)\)/);
  assert.match(ui,/dimensionManagerFilter=String\(state\.filter\)/);
  assert.match(ui,/dimensionManagerSort=String\(state\.sort\)/);
});
