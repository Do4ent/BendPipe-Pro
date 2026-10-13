import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const properties=fs.readFileSync(path.join(root,"src","ui","properties-panel-runtime.js"),"utf8");
test("question 434: Dimension Properties shows per-reason review progress",()=>{
  assert.match(properties,/const reviewReasonProgress=Object\.fromEntries\(reviewReasons\.map\(reason=>\{/);
  assert.match(properties,/dimension_count:state\.dimension_count/);
  assert.match(properties,/selected_dimension_count:state\.selected_dimension_count/);
  assert.match(properties,/unselected_dimension_count:state\.unselected_dimension_count/);
  assert.match(properties,/selected_percent:state\.selected_percent/);
  assert.match(properties,/selection_coverage:state\.selection_coverage/);
  assert.match(properties,/reason_progress:canonicalReviewContext\?\.reason_progress\?\?reviewReasonProgress/);
  assert.match(properties,/\["Dimension reason progress",reviewDisplay\.reason_progress\]/);
});
