import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const ui=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");

test("question 375: review item normalization is centralized",()=>{
  assert.match(ui,/function dimensionReviewProgressItems\(items=savedDimensions\(\)\)/);
  const local=ui.match(/function dimensionReviewProgress\(items=savedDimensions\(\),selectedIds=selectedDimensionAuditIds\(\)\)\{([\s\S]*?)\n  \}/)?.[1]??"";
  const domain=ui.match(/function domainDimensionReviewProgress\(items=savedDimensions\(\),selectedIds=selectedDimensionAuditIds\(\)\)\{([\s\S]*?)\n  \}/)?.[1]??"";
  assert.match(local,/const reviewItems=dimensionReviewProgressItems\(items\)/);
  assert.match(domain,/const reviewItems=dimensionReviewProgressItems\(items\)/);
});
