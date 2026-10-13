import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const ui=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");

test("question 376: review progress exposes domain-vs-fallback parity helper",()=>{
  const fn=ui.match(/function dimensionReviewProgressParity\(items=savedDimensions\(\),selectedIds=selectedDimensionAuditIds\(\)\)\{([\s\S]*?)\n  \}/)?.[1]??"";
  assert.match(fn,/const fallback=dimensionReviewProgressFallback\(reviewItems,selectedIds\)/);
  assert.match(fn,/const domain=domainDimensionReviewProgress\(items,selectedIds\)/);
  assert.match(fn,/available:domain!=null/);
  assert.match(fn,/consistent:domain!=null\?domainSignature===fallbackSignature:null/);
  assert.match(fn,/fallback_signature:fallbackSignature/);
  assert.match(fn,/domain_signature:domainSignature/);
});
