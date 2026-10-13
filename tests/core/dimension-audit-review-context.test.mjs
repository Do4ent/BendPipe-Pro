import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const ui=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");

test("question 455: Dimension audit persists canonical review context",()=>{
  const fn=ui.match(/function dimensionRebindAuditSnapshot\(dimension,reviewContextState=null\)\{([\s\S]*?)\n  \}/)?.[1]??"";
  assert.match(fn,/const contextState=reviewContextState\?\?dimensionReviewContextState\(\)/);
  assert.match(fn,/const reviewContext=dimensionReviewContext\(dimension,contextState\)/);
  assert.match(fn,/review_context:clone\(reviewContext\)/);
  assert.match(fn,/review_context_signature:String\(reviewContext\?\.signature\?\?""\)/);
});
