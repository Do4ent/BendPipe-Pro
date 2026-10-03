import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const code=fs.readFileSync(path.join(root,"src","ui","material-manufacturing-bridge.js"),"utf8");

function load(){
  const sandbox={window:{}};
  vm.runInNewContext(code,sandbox,{filename:"material-manufacturing-bridge.js"});
  return sandbox.window.TubeBenderMaterialManufacturing;
}

function project(profile){
  return {materialLibrary:{project_profiles:profile?[profile]:[]}};
}

test("material manufacturing bridge remains classic JavaScript",()=>{
  assert.doesNotThrow(()=>new vm.Script(code));
  assert.match(code,/TubeBenderMaterialManufacturing/);
  assert.match(code,/roundTripValidate/);
});

test("material compensation keeps nominal angle separate from machine command",()=>{
  const api=load();
  const p=project({id:"mat-1",name:"Steel",springback:1.05,density_kg_m3:7850});
  const tube={material_profile_id:"mat-1"};
  const result=api.compensateBend({project:p,tube,nominalAngleDeg:90});
  assert.equal(result.ok,true);
  assert.equal(result.nominalAngleDeg,90);
  assert.equal(result.commandAngleDeg,94.5);
  assert.equal(result.materialDeltaDeg,4.5);
  assert.equal(result.springbackFactor,1.05);
});

test("material compensation refuses to invent springback when material is missing",()=>{
  const api=load();
  const result=api.compensateBend({project:project(null),tube:{},nominalAngleDeg:90});
  assert.equal(result.ok,false);
  assert.equal(result.commandAngleDeg,null);
  assert.match(result.errors.join(" "),/Material Profile/);
});

test("material compensation refuses undefined springback",()=>{
  const api=load();
  const p=project({id:"mat-1",name:"Steel",springback:null,density_kg_m3:7850});
  const result=api.compensateBend({project:p,tube:{material_profile_id:"mat-1"},nominalAngleDeg:90});
  assert.equal(result.ok,false);
  assert.equal(result.commandAngleDeg,null);
  assert.match(result.errors.join(" "),/springback factor/i);
});

test("density comes only from assigned project material profile",()=>{
  const api=load();
  const p=project({id:"mat-1",name:"Steel",springback:1.04,density_kg_m3:7850});
  assert.equal(api.densityKgM3(p,{material_profile_id:"mat-1"}),7850);
  assert.equal(api.densityKgM3(p,{material_profile_id:"other"}),null);
});

test("manufacturing validation blocks missing machine command angles",()=>{
  const api=load();
  const p=project({id:"mat-1",name:"Steel",springback:1.04,density_kg_m3:7850});
  const result=api.validateManufacturingData({
    project:p,
    tube:{material_profile_id:"mat-1"},
    manufacturing:{
      machine:{ncPost:"generic-ybc",maxBendAngle:190,rotationLimit:360,minFeed:0},
      steps:[{bend:1,Y:100,B:0,C:90,commandAngle:null}]
    },
    kind:"nc"
  });
  assert.equal(result.ok,false);
  assert.match(result.errors.join(" "),/машинный угол/i);
});

test("generic YBC round trip validates exact machine values",()=>{
  const api=load();
  const expected=[
    {bend:1,Y:100,B:0,commandAngle:94.5},
    {bend:2,Y:80,B:90,commandAngle:47.25}
  ];
  const text="; test\nY100.000 B0.000 C94.500\nY80.000 B90.000 C47.250";
  const result=api.roundTripValidate({text,format:"YBC",expectedSteps:expected});
  assert.equal(result.supported,true);
  assert.equal(result.ok,true);
  assert.equal(result.status,"Valid");
});

test("generic LRA round trip detects altered output",()=>{
  const api=load();
  const expected=[{bend:1,L:100,R:0,commandAngle:94.5}];
  const result=api.roundTripValidate({
    text:"L100.000 R0.000 A94.400",
    format:"LRA",
    expectedSteps:expected
  });
  assert.equal(result.ok,false);
  assert.match(result.errors.join(" "),/машинный угол/i);
});

test("unknown postprocessor format is explicitly not checked, not falsely valid",()=>{
  const api=load();
  const result=api.roundTripValidate({text:"X",format:"CUSTOM",expectedSteps:[]});
  assert.equal(result.supported,false);
  assert.equal(result.status,"NotChecked");
  assert.equal(result.ok,true);
});


test("manufacturing validation includes equipment assignment blockers",()=>{
  const api=load();
  const p=project({id:"mat-1",name:"Steel",springback:1.04,density_kg_m3:7850});
  const result=api.validateManufacturingData({
    project:p,
    tube:{material_profile_id:"mat-1"},
    manufacturing:{
      equipmentValidation:{ok:false,status:"Error",errors:["Tooling incompatible"],warnings:[]},
      machine:{ncPost:"generic-ybc"},
      steps:[{bend:1,Y:100,B:0,C:90,commandAngle:93.6}]
    },
    kind:"nc"
  });
  assert.equal(result.ok,false);
  assert.match(result.errors.join(" "),/Equipment: Tooling incompatible/);
});
