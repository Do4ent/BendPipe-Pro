import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const ui=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");

test("question 214: Saved Dimensions manager disables mutating actions in read-only",()=>{
  assert.match(ui,/const locked=readonly\(\)/);
  assert.match(ui,/!visible&&locked\?'disabled title="Проект открыт только для просмотра"'/);
  assert.match(ui,/data-dim-manager-visible/);
  assert.match(ui,/data-dim-manager-delete/);
  assert.match(ui,/data-section-rebind/);
  assert.match(ui,/data-show-dimension-audit/);
  assert.match(ui,/data-show-select-dimension-audit/);
  assert.match(ui,/data-hide-dimension-audit/);
});

test("question 214: read-only manager keeps inspection actions available",()=>{
  assert.match(ui,/data-select-visible-dimension-audit>Select visible results/);
  assert.match(ui,/data-copy-visible-dimension-audits>Copy visible audit JSON/);
  assert.match(ui,/data-copy-all-dimension-audits>Copy all audit JSON/);
});
