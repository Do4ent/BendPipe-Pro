import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const build=fs.readFileSync(path.join(root,"scripts","build-standalone.mjs"),"utf8");

test("question 341: standalone build bundles review progress domain module",()=>{
  assert.match(build,/reviewProgressDomainPath = path\.join\(root, "src", "domain", "measurements", "review-progress\.mjs"\)/);
  assert.match(build,/const reviewProgressDomainUrl = moduleDataUrl\(reviewProgressDomainPath\)/);
  assert.match(build,/\.replace\("__TB_REVIEW_PROGRESS_MODULE_URL__", reviewProgressDomainUrl\)/);
});
