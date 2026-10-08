import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const properties=fs.readFileSync(path.join(root,"src","ui","properties-panel-runtime.js"),"utf8");

test("question 445: Dimension Properties shows combined review blockers",()=>{
  assert.match(properties,/const reviewBlockers=\[/);
  assert.match(properties,/pendingReviewReasons\.map\(reason=>"REVIEW:"\+String\(reason\)\)/);
  assert.match(properties,/reviewDiagnosticsRuntime\?\.diagnostics\?\.errors\?\?\[\]\)\.map\(code=>"DIAGNOSTIC:"\+String\(code\)\)/);
  assert.match(properties,/blockers:canonicalReviewContext\?\.blockers\?\?reviewBlockers/);
  assert.match(properties,/\["Review blockers",reviewDisplay\.blockers\]/);
});
