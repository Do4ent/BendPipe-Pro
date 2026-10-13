import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const ui=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");

test("question 347: current domain review progress snapshot is exposed",()=>{
  assert.match(ui,/currentDomainReviewProgressSnapshot:\(\)=>\{const progress=domainDimensionReviewProgress\(\);return progress&&reviewProgressDomain\?\.reviewProgressSnapshot\?reviewProgressDomain\.reviewProgressSnapshot\(progress\):null;\}/);
});
