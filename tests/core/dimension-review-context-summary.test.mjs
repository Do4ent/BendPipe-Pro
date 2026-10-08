import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const ui=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");

test("question 457: Dimension review context summary aggregates state health and blockers",()=>{
  const fn=ui.match(/function dimensionReviewContextSummary\(items=savedDimensions\(\),contextState=null\)\{([\s\S]*?)\n  \}/)?.[1]??"";
  assert.match(fn,/action_required:0/);
  assert.match(fn,/by_state:\{\}/);
  assert.match(fn,/by_health:\{\}/);
  assert.match(fn,/blocker_counts:\{\}/);
  assert.match(fn,/summary\.by_state\[context\.state\]/);
  assert.match(fn,/summary\.by_health\[context\.health\]/);
  assert.match(fn,/if\(context\.action_required\)summary\.action_required\+\+/);
  assert.match(fn,/summary\.blocker_counts\[key\]/);
});
