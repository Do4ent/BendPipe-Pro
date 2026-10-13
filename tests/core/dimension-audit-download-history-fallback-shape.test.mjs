import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const ui=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");

test("question 680: fallback history snapshot shape matches canonical project context fields",()=>{
  const fn=ui.match(/function dimensionAuditDownloadAttemptHistoryAuditSnapshot\(\)\{([\s\S]*?)\n  \}/)?.[1]??"";
  assert.match(fn,/const context=dimensionAuditProjectContext\(\)/);
  assert.match(fn,/project_id:context\.project_id/);
  assert.match(fn,/project_name:context\.project_name/);
  assert.match(fn,/generated_at:context\.generated_at/);
  assert.doesNotMatch(fn,/\.\.\.dimensionAuditProjectContext\(\)/);
  assert.doesNotMatch(fn,/project_readonly/);
});
