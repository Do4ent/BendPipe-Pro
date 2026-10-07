import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const ui=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");

test("question 382: review progress domain delegation is gated by compatibility",()=>{
  assert.match(ui,/if\(reviewProgressDomainCompatibility\(\)\.compatible\)\{/);
  assert.match(ui,/if\(reviewProgressDomainCompatibility\(\)\.compatible\)return reviewProgressDomain\.reviewProgressSignature/);
  assert.match(ui,/if\(reviewProgressDomainCompatibility\(\)\.compatible\)return reviewProgressDomain\.reviewProgressSnapshot/);
  assert.match(ui,/if\(!reviewProgressDomainCompatibility\(\)\.compatible\)return null/);
});
