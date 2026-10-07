import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const properties=fs.readFileSync(path.join(root,"src","ui","properties-panel-runtime.js"),"utf8");

test("question 189: Dimension Properties expands Fitted audit statistics",()=>{
  assert.match(properties,/\["Fitted reference count",fittedStats\?\.reference_count\]/);
  assert.match(properties,/\["Max fit error mm",fittedStats\?audit\?\.auditNumber\?\.\(fittedStats\.max_error_mm\):null\]/);
  assert.match(properties,/\["Max fit error deg",fittedStats\?audit\?\.auditNumber\?\.\(fittedStats\.max_error_deg\):null\]/);
  assert.match(properties,/\["Min confidence",fittedStats\?audit\?\.auditNumber\?\.\(fittedStats\.min_confidence\):null\]/);
});
