import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const code=fs.readFileSync(path.join(root,"src","ui","equipment-library-ui.js"),"utf8");

test("equipment library UI remains valid classic JavaScript",()=>{
  assert.doesNotThrow(()=>new vm.Script(code,{filename:"equipment-library-ui.js"}));
  assert.match(code,/__TB_MACHINE_TOOLING_MODULE_URL__/);
  assert.match(code,/data-tab="machine-profiles"/);
  assert.match(code,/data-tab="machine-instances"/);
  assert.match(code,/data-tab="tooling-sets"/);
  assert.match(code,/data-tab="tooling-instances"/);
  assert.match(code,/data-tab="tube"/);
});

test("equipment library is project-scoped and uses model history for writes",()=>{
  assert.match(code,/p\?\.equipmentLibrary/);
  assert.match(code,/p\.equipmentLibrary=clone\(next\)/);
  assert.match(code,/modelCommand/);
  assert.match(code,/Изменить Equipment Library/);
});

test("tube equipment assignment is explicit and reversible",()=>{
  assert.match(code,/machine_profile_id/);
  assert.match(code,/machine_instance_id/);
  assert.match(code,/tooling_set_id/);
  assert.match(code,/tooling_instance_id/);
  assert.match(code,/Назначить оборудование трубе/);
  assert.match(code,/Снять назначения оборудования/);
  assert.match(code,/equipment_calculation_state="Stale"/);
  assert.match(code,/equipment_calculation_state="Legacy"/);
});

test("equipment UI does not expose removed maintenance or wear workflow",()=>{
  assert.doesNotMatch(code,/Maintenance Log/);
  assert.doesNotMatch(code,/cycle_count/);
  assert.doesNotMatch(code,/wear correction/i);
});

test("Machine Instance form has no calibration field while Tooling Instance exposes angle correction",()=>{
  assert.doesNotMatch(code,/Machine Instance[^\n]*calibration/i);
  assert.match(code,/Angle correction, °/);
  assert.match(code,/angle_correction_deg/);
});

test("legacy equipment is only a fallback until explicit assignment",()=>{
  assert.match(code,/Legacy \/ не назначен/);
  assert.match(code,/Без явного назначения TubeBender использует существующие legacy machine\/tooling данные/);
  assert.match(code,/После назначения новая модель имеет приоритет/);
});
