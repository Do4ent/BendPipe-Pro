import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import {fileURLToPath} from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const code=fs.readFileSync(path.join(root,"src","ui","trim-cut-runtime-bridge.js"),"utf8");
function load(){const sandbox={window:{}};vm.runInNewContext(code,sandbox);return sandbox.window.TubeBenderTrimCutRuntime;}

test("trim cut runtime bridge remains classic JavaScript",()=>{
  assert.doesNotThrow(()=>new vm.Script(code));
  assert.match(code,/TubeBenderTrimCutRuntime/);
});

test("runtime trim plan removes cut, automatic and setup allowances",()=>{
  const api=load();
  const plan=api.buildPlan({
    tube:{},
    endAllowances:{startAllowance:10,endAllowance:5},
    setupExtensions:{start_mm:20,end_mm:15},
    style:{cutAllowanceStart:3,cutAllowanceEnd:2}
  });
  assert.equal(plan.required_removal_mm,55);
  assert.equal(plan.operations[0].remove_length_mm,33);
  assert.equal(plan.operations[1].remove_length_mm,22);
  assert.equal(plan.nominal_geometry_changed,false);
});

test("runtime trim preferences alter method and tolerance only",()=>{
  const api=load();
  const plan=api.buildPlan({
    tube:{trim_preferences:{P1:{method:"laser",tolerance_mm:0.1}}},
    endAllowances:{startAllowance:10,endAllowance:0}
  });
  assert.equal(plan.operations[0].method,"laser");
  assert.equal(plan.operations[0].tolerance_mm,0.1);
  assert.equal(plan.operations[0].remove_length_mm,10);
});

test("finished length subtracts only enabled manufacturing trim",()=>{
  const api=load();
  const plan=api.buildPlan({
    endAllowances:{startAllowance:10,endAllowance:5},
    setupExtensions:{start_mm:20,end_mm:15}
  });
  assert.equal(api.finishedLength(1050,plan),1000);
});

test("invalid explicit trim plane blocks validation",()=>{
  const api=load();
  const plan=api.buildPlan({
    tube:{trim_preferences:{P1:{plane:{mode:"explicit",normal:{x:0,y:0,z:0}}}}},
    endAllowances:{startAllowance:10,endAllowance:0}
  });
  const result=api.validate(plan);
  assert.equal(result.ok,false);
  assert.match(result.errors.join(" "),/no normal/);
});
