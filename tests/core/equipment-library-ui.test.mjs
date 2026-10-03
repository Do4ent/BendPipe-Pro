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
  assert.match(code,/__TB_MACHINE_SETUP_MODULE_URL__/);
  assert.match(code,/data-tab="machine-profiles"/);
  assert.match(code,/data-tab="machine-instances"/);
  assert.match(code,/data-tab="tooling-sets"/);
  assert.match(code,/data-tab="tooling-instances"/);
  assert.match(code,/data-tab="setups"/);
  assert.match(code,/data-tab="trim"/);
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


test("equipment assignment UI labels tooling compatibility without auto-assigning",()=>{
  assert.match(code,/domain\.suggestToolingSets/);
  assert.match(code,/Compatible/);
  assert.match(code,/Conditional/);
  assert.match(code,/Incompatible/);
  assert.match(code,/refreshToolingSuggestions/);
  assert.doesNotMatch(code,/tooling_set_id=.*Compatible/);
});


test("Machine Setup UI keeps setup changes on the tube and uses history",()=>{
  assert.match(code,/function renderMachineSetups/);
  assert.match(code,/function editMachineSetup/);
  assert.match(code,/machine_setups/);
  assert.match(code,/active_machine_setup_id/);
  assert.match(code,/Создать Machine Setup/);
  assert.match(code,/Выбрать Machine Setup/);
  assert.match(code,/Удалить Machine Setup/);
  assert.match(code,/clamping_extensions/);
  assert.match(code,/offset_method/);
});


test("Trim Cut UI keeps removal length computed and only edits process preferences",()=>{
  assert.match(code,/function renderTrimCut/);
  assert.match(code,/снять /);
  assert.match(code,/Длина снятия рассчитывается автоматически/);
  assert.match(code,/cut allowance \+ end allowance \+ clamping extension/);
  assert.match(code,/Nominal geometry changed: <b>NO<\/b>/);
  assert.match(code,/data-key="tolerance_mm"/);
  assert.match(code,/data-key="plane_mode"/);
  assert.match(code,/data-key="normal_x"/);
  assert.match(code,/Изменить Trim\/Cut/);
  assert.doesNotMatch(code,/data-key="remove_length_mm"/);
});
