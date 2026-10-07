import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const properties=fs.readFileSync(path.join(root,"src","ui","properties-panel-runtime.js"),"utf8");

test("question 190: Dimension Properties uses shared Fitted audit number formatting",()=>{
  assert.match(properties,/audit\?\.auditNumber\?\.\(fittedStats\.max_error_mm\)/);
  assert.match(properties,/audit\?\.auditNumber\?\.\(fittedStats\.max_error_deg\)/);
  assert.match(properties,/audit\?\.auditNumber\?\.\(fittedStats\.min_confidence\)/);
});
