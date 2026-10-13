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


test("manufacturing validation includes Trim Cut blockers",()=>{
  const api=load();
  const p=project({id:"mat-1",name:"Steel",springback:1.04,density_kg_m3:7850});
  const result=api.validateManufacturingData({
    project:p,
    tube:{material_profile_id:"mat-1"},
    manufacturing:{
      trimValidation:{ok:false,status:"Error",errors:["P1 plane invalid"],warnings:[]},
      machine:{ncPost:"generic-ybc"},
      steps:[{bend:1,Y:100,B:0,C:90,commandAngle:93.6}]
    },
    kind:"nc"
  });
  assert.equal(result.ok,false);
  assert.match(result.errors.join(" "),/Trim\/Cut: P1 plane invalid/);
});


test("material check enforces configured D/t range for the actual tube",()=>{
  const api=load();
  const p=project({
    id:"mat-1",name:"Steel",springback:1.04,
    dt_ratio_min:10,dt_ratio_max:20,minimum_clr_mm:30
  });
  const result=api.materialCheck(p,{
    material_profile_id:"mat-1",
    od_mm:30,
    wall_mm:1,
    bend_clr_mm:[40]
  },{requireSpringback:true});
  assert.equal(result.ok,false);
  assert.match(result.errors.join(" "),/D\/t .* выше допустимого максимума/);
});

test("material minimum CLR is a warning and requires explicit acknowledgement before manufacturing release",()=>{
  const api=load();
  const profile={
    id:"mat-1",name:"Steel",springback:1.04,
    dt_ratio_min:10,dt_ratio_max:40,minimum_clr_mm:50
  };
  const p=project(profile);
  const tube={
    material_profile_id:"mat-1",
    od_mm:20,
    wall_mm:1,
    bend_clr_mm:[40]
  };
  const preview=api.materialCheck(p,tube,{requireSpringback:true});
  assert.equal(preview.ok,true);
  assert.equal(preview.status,"Warning");
  assert.equal(preview.warning_ack_required,true);
  assert.match(preview.warnings.join(" "),/меньше рекомендуемого/);

  const release=api.materialCheck(p,tube,{requireSpringback:true,requireWarningAck:true});
  assert.equal(release.ok,false);
  assert.match(release.errors.join(" "),/требуют явного подтверждения/);

  const acknowledged={...tube,material_warning_ack_signature:api.materialFingerprint(profile)};
  const accepted=api.materialCheck(p,acknowledged,{requireSpringback:true,requireWarningAck:true});
  assert.equal(accepted.ok,true);
  assert.equal(accepted.warning_acknowledged,true);
  assert.equal(accepted.warning_ack_required,false);
});

test("material warning acknowledgement is invalidated by any relevant profile change",()=>{
  const api=load();
  const profile={id:"mat-1",name:"Steel",springback:1.04,minimum_clr_mm:50};
  const tube={
    material_profile_id:"mat-1",
    bend_clr_mm:[40],
    material_warning_ack_signature:api.materialFingerprint(profile)
  };
  assert.equal(api.materialCheck(project(profile),tube,{requireWarningAck:true}).ok,true);

  const changed={...profile,springback:1.05};
  const result=api.materialCheck(project(changed),tube,{requireWarningAck:true});
  assert.equal(result.ok,false);
  assert.equal(result.warning_ack_required,true);
});
