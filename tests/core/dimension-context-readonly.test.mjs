import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const ui=fs.readFileSync(path.join(root,"src","ui","object-selection-context-ui.js"),"utf8");

test("question 208: mutating Dimension context actions are disabled in read-only projects",()=>{
  assert.match(ui,/function engineeringReadonly\(\)/);
  assert.match(ui,/window\.TubeBenderEngineering\?\.readonly\?\.\(\)===true/);
  assert.match(ui,/dimensionEdit\.disabled=!dimensionOnly\|\|readOnly/);
  assert.match(ui,/dimensionHide\.disabled=!dimensionOnly\|\|readOnly/);
  assert.match(ui,/dimensionDelete\.disabled=!dimensionOnly\|\|readOnly/);
  assert.match(ui,/Проект открыт только для просмотра/);
});
