import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const ui=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");

test("question 383: review progress runtime state exposes domain compatibility",()=>{
  const fn=ui.match(/function dimensionReviewProgressRuntimeState\(items=savedDimensions\(\),selectedIds=selectedDimensionAuditIds\(\)\)\{([\s\S]*?)\n  \}/)?.[1]??"";
  assert.match(fn,/const compatibility=reviewProgressDomainCompatibility\(\)/);
  assert.match(fn,/domain_available:compatibility\.available/);
  assert.match(fn,/domain_compatible:compatibility\.compatible/);
  assert.match(fn,/domain_status:compatibility\.status/);
  assert.match(fn,/domain_comparable:parity\.available/);
  assert.match(fn,/domain_consistent:parity\.consistent/);
});
