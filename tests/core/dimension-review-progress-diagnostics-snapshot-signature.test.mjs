import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const ui=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");

test("question 408: diagnostics runtime validates snapshot signature consistency",()=>{
  const fn=ui.match(/function dimensionReviewProgressDiagnosticsRuntimeState\(items=savedDimensions\(\),selectedIds=selectedDimensionAuditIds\(\)\)\{([\s\S]*?)\n  \}/)?.[1]??"";
  assert.match(fn,/const snapshot=dimensionReviewProgressDiagnosticsSnapshot\(state\.diagnostics\)/);
  assert.match(fn,/const snapshotSignatureConsistent=String\(snapshot\?\.signature\?\?""\)===String\(state\.signature\?\?""\)/);
  assert.match(fn,/snapshot_signature_consistent:snapshotSignatureConsistent/);
});
