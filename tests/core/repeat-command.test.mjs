import test from "node:test";
import assert from "node:assert/strict";
import {
  sanitizeRepeatSettings,
  normalizeRepeatCommand,
  pushRecentCommand,
  createRepeatState,
  serializeRepeatState,
  parseRepeatState,
  repeatDisplayLabel
} from "../../src/domain/editing/repeat-command.mjs";

test("question 103: repeat settings strip object identities and points but keep scalar options",()=>{
  const safe=sanitizeRepeatSettings({
    selection:["tube-1"],
    object_id:"tube-1",
    base:{x:1,y:2,z:3},
    target_xyz:"100;0;0",
    point:{x:5,y:6,z:7},
    rotateAxis:"Z",
    rotateAngle:"45",
    centerMode:"own",
    ortho:true,
    polarStep:15
  });
  assert.equal("selection" in safe,false);
  assert.equal("object_id" in safe,false);
  assert.equal("base" in safe,false);
  assert.equal("target_xyz" in safe,false);
  assert.equal("point" in safe,false);
  assert.equal(safe.rotateAxis,"Z");
  assert.equal(safe.rotateAngle,"45");
  assert.equal(safe.centerMode,"own");
  assert.equal(safe.ortho,true);
  assert.equal(safe.polarStep,15);
});

test("question 103: recent commands are newest-first bounded and deduplicate identical head",()=>{
  let recent=[];
  recent=pushRecentCommand(recent,{id:"edit.move",label:"Move",settings:{dx:10}},{limit:3});
  recent=pushRecentCommand(recent,{id:"edit.rotate",label:"Rotate",settings:{angle:90}},{limit:3});
  recent=pushRecentCommand(recent,{id:"edit.rotate",label:"Rotate",settings:{angle:90}},{limit:3});
  assert.equal(recent.length,2);
  assert.equal(recent[0].id,"edit.rotate");
  recent=pushRecentCommand(recent,{id:"edit.copy",label:"Copy",settings:{mode:"multiple"}},{limit:3});
  recent=pushRecentCommand(recent,{id:"edit.split",label:"Split",settings:{value:50}},{limit:3});
  assert.deepEqual(recent.map(x=>x.id),["edit.split","edit.copy","edit.rotate"]);
});

test("question 103: command history persists without selection or point data",()=>{
  const state=createRepeatState({recent:[
    normalizeRepeatCommand({id:"edit.move",label:"Move",settings:{selection:["x"],editDx:5,point:{x:1,y:2,z:3}}})
  ]});
  const parsed=parseRepeatState(serializeRepeatState(state));
  assert.equal(parsed.last.id,"edit.move");
  assert.equal(parsed.last.settings.editDx,5);
  assert.equal("selection" in parsed.last.settings,false);
  assert.equal("point" in parsed.last.settings,false);
  assert.equal(repeatDisplayLabel(parsed.last),"Повторить: Move");
});
