import test from "node:test";
import assert from "node:assert/strict";

import {
  ClearanceStatus,
  classifyClearance,
  createClearanceMonitor,
  deleteClearanceMonitor,
  evaluateClearanceMonitor,
  evaluateClearanceMonitors,
  updateClearanceMonitor
} from "../../src/domain/validation/clearance-monitor.mjs";

function monitor(overrides={}){
  return createClearanceMonitor({
    id:"cm-1",
    name:"Tube to frame",
    members:[{kind:"tube",id:"tube-1"},{kind:"object",id:"frame-1"}],
    minimum_clearance_mm:2,
    warning_clearance_mm:5,
    ...overrides
  },{monitorId:"cm-1"});
}

test("clearance monitor requires at least two explicit members",()=>{
  assert.throws(
    ()=>createClearanceMonitor({name:"bad",members:[{kind:"tube",id:"t"}]}),
    /at least two members/
  );
});

test("clearance thresholds classify green yellow and red",()=>{
  const m=monitor();
  assert.equal(classifyClearance(10,m).status,ClearanceStatus.GREEN);
  assert.equal(classifyClearance(3,m).status,ClearanceStatus.YELLOW);
  assert.equal(classifyClearance(1,m).status,ClearanceStatus.RED);
  assert.equal(classifyClearance(null,m).status,ClearanceStatus.NOT_CHECKED);
});

test("warning threshold cannot be below minimum threshold",()=>{
  assert.throws(()=>monitor({minimum_clearance_mm:5,warning_clearance_mm:2}),/cannot be below/);
});

test("disabled monitor is explicitly not checked",()=>{
  const result=evaluateClearanceMonitor(monitor({enabled:false}),{distance_mm:0});
  assert.equal(result.enabled,false);
  assert.equal(result.status,ClearanceStatus.NOT_CHECKED);
});

test("monitor evaluation preserves measurement evidence and closest points",()=>{
  const result=evaluateClearanceMonitor(monitor(),{
    distance_mm:1.5,
    closest_points:{a:{x:0,y:0,z:0},b:{x:1.5,y:0,z:0}},
    source:"precise-narrow-phase"
  });
  assert.equal(result.status,ClearanceStatus.RED);
  assert.equal(result.distance_mm,1.5);
  assert.equal(result.source,"precise-narrow-phase");
  assert.equal(result.closest_points.b.x,1.5);
});

test("group evaluation reports worst status without hiding not-checked monitors",()=>{
  const monitors=[
    monitor(),
    createClearanceMonitor({
      id:"cm-2",name:"Tube 2 to frame",
      members:[{kind:"tube",id:"tube-2"},{kind:"object",id:"frame-1"}],
      minimum_clearance_mm:1,warning_clearance_mm:4
    },{monitorId:"cm-2"}),
    createClearanceMonitor({
      id:"cm-3",name:"Tube 3 to frame",
      members:[{kind:"tube",id:"tube-3"},{kind:"object",id:"frame-1"}]
    },{monitorId:"cm-3"})
  ];
  const result=evaluateClearanceMonitors(monitors,{
    "cm-1":{distance_mm:8},
    "cm-2":{distance_mm:2}
  });
  assert.equal(result.status,ClearanceStatus.YELLOW);
  assert.equal(result.green_count,1);
  assert.equal(result.yellow_count,1);
  assert.equal(result.not_checked_count,1);
});

test("monitor update preserves stable identity",()=>{
  const m=monitor(), updated=updateClearanceMonitor([m],"cm-1",{warning_clearance_mm:8})[0];
  assert.equal(updated.id,"cm-1");
  assert.equal(updated.warning_clearance_mm,8);
});

test("monitor delete affects only requested monitor",()=>{
  const a=monitor();
  const b=createClearanceMonitor({
    id:"cm-2",name:"B",
    members:[{kind:"tube",id:"t2"},{kind:"tube",id:"t3"}]
  },{monitorId:"cm-2"});
  const left=deleteClearanceMonitor([a,b],"cm-1");
  assert.deepEqual(left.map((x)=>x.id),["cm-2"]);
});

test("visibility is not part of clearance monitor definition",()=>{
  const m=monitor();
  assert.equal("visible" in m,false);
  assert.equal("hidden" in m,false);
  assert.equal("uiHiddenIn3D" in m,false);
});
