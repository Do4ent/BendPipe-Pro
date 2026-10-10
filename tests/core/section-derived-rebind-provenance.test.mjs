import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const measurements=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");

test("question 115: Section-derived rebind compares provenance signatures",()=>{
  assert.match(measurements,/function sectionReferenceSignature\(ref\)/);
  assert.match(measurements,/object_id:String\(ref\?\.object_id\?\?""\)/);
  assert.match(measurements,/source_geometry:String\(snapshot\?\.source_geometry\?\?""\)/);
  assert.match(measurements,/section_mode:String\(snapshot\?\.mode\?\?""\)/);
  assert.match(measurements,/function sectionRebindCompatibility\(existing,current\)/);
});

test("question 115: rebind rejects source-object and Section-mode mismatch",()=>{
  assert.match(measurements,/Текущая Section-derived геометрия относится к другому исходному объекту/);
  assert.match(measurements,/Источник геометрии Section-derived ссылки изменился/);
  assert.match(measurements,/Section mode не совпадает с сохранённым размером/);
  assert.match(measurements,/if\(!compatibility\.ok\)\{toast\(compatibility\.reason\);return false;\}/);
});

test("question 115: explicit rebind keeps an audit trail of replaced references",()=>{
  assert.match(measurements,/rebound_history:\[/);
  assert.match(measurements,/previous_references:clone\(dimension\.references\?\?\[\]\)/);
  assert.match(measurements,/previous_value:dimension\.value\?\?null/);
  assert.match(measurements,/new_reference_signatures:clone\(compatibility\.signatures\)/);
  assert.match(measurements,/reason:"explicit-section-derived-rebind"/);
});
