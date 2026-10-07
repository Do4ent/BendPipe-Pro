import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const ui=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");

test("question 242: Dimension audit filename parts use one Unicode-safe sanitizer",()=>{
  assert.match(ui,/function dimensionAuditFilenamePart\(value,fallback="item"\)/);
  assert.match(ui,/replace\(\/\[\^\\p\{L\}\\p\{N\}\._-\]\+\/gu,"_"\)/);
  assert.match(ui,/return safe\|\|String\(fallback\)/);
  assert.match(ui,/dimensionAuditFilenamePart\(snapshot\.project_name\|\|snapshot\.project_id,"project"\)/);
  assert.match(ui,/dimensionAuditFilenamePart\(dimension\?\.id,"dimension"\)/);
});
