import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const ui=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");

test("question 465: review context health filters show live counts",()=>{
  assert.match(ui,/'review-ready':'Review ready \('\+\(managerReviewContextSummary\.by_health\?\.ready\?\?0\)\+'\)'/);
  assert.match(ui,/'review-pending':'Review pending \('\+\(managerReviewContextSummary\.by_health\?\.pending\?\?0\)\+'\)'/);
  assert.match(ui,/'review-diagnostics-error':'Review diagnostics error \('\+\(managerReviewContextSummary\.by_health\?\.\["diagnostics-error"\]\?\?0\)\+'\)'/);
});
