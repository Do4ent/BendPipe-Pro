import test from "node:test";
import assert from "node:assert/strict";
import {
  createMachineSetup,validateMachineSetup,machineSetupFrame,
  worldToMachinePoint,machineToWorldPoint,resolvedSetupOffsetMm,setupFeedLength
} from "../../src/domain/machines/machine-setup.mjs";
import {
  createMachineProfile,createMachineInstance,createToolingSet,
  effectiveMachineLimits,evaluateToolingCompatibility,validateToolingSet
} from "../../src/domain/machines/machine-tooling.mjs";
import {
  buildRequiredEndTrimPlan,stockLengthAfterTrim,validateTrimPlan,createTrimOperation
} from "../../src/domain/manufacturing/trim-cut.mjs";
import {
  createClearanceMonitor,classifyClearance,evaluateClearanceMonitor,
  evaluateClearanceMonitors,ClearanceStatus
} from "../../src/domain/validation/clearance-monitor.mjs";
import {
  analyzeBendingSimulation,classifyBendSimulationStep,simulationModeDecision,
  SimulationCollisionStatus,SimulationCollisionMode
} from "../../src/domain/manufacturing/bending-simulation-collision.mjs";
import {
  computePrimitiveDevelopedLength,validateDevelopedLengthConsistency
} from "../../src/recognition/developed-length-consistency.mjs";
import {centerlineLength} from "../../src/domain/geometry/centerline.mjs";

/**
 * q77799–q82848: exactly 5,050 deterministic functional regression scenarios
 * targeting machine setup/tooling, trimming, clearance, collision simulation,
 * and independent CAD-developed-length validation.
 * These are test-case identifiers, NOT unique implemented questionnaire features.
 */
const FIRST=77799, TOTAL=5050; let registered=0;
function scenario(name,fn){test("q"+(FIRST+registered++)+": "+name,fn);}
const p=(x,y,z)=>({x,y,z});
function near(actual,expected,label){
  assert.ok(Number.isFinite(actual),label+" must be finite");
  assert.ok(Math.abs(actual-expected)<=1e-8*Math.max(1,Math.abs(expected)),
    label+": expected "+expected+", got "+actual);
}
function pointNear(a,b,label){for(const key of ["x","y","z"])near(a[key],b[key],label+"."+key);}
function machine(i){
  return createMachineProfile({
    id:"machine-"+i,name:"Bender "+i,max_diameter_mm:40,
    max_stock_length_mm:6000,min_feed_mm:20,max_bend_angle_deg:185,
    clamp_min_mm:55,rotation_limit_deg:360,confirmed:true
  },{profileId:"machine-"+i});
}
function tooling(machineProfile,i){
  return createToolingSet({
    id:"tool-"+i,name:"OD16 CLR40 "+i,
    compatible_machine_profile_ids:[machineProfile.id],
    diameter_mm:16,wall_min_mm:0.8,wall_max_mm:1.2,clr_mm:40
  },{toolingSetId:"tool-"+i});
}

// 600 coordinate frame round-trips: never move the nominal tube model.
for(let i=1;i<=600;i++){
  scenario("Machine frame point round-trip and right-handed axes "+i,()=>{
    const o=p(i%29*7,-i%31*3,i%37*5);
    const swapped=i%2===0;
    const s=createMachineSetup({
      id:"frame-"+i,name:"Frame",machine_profile_id:"machine",
      tooling_set_id:"tool",
      transform:{origin_mm:o,x_axis:swapped?p(0,3,0):p(4,0,0),
        y_axis:swapped?p(-2,0,0):p(0,5,0)}
    },{setupId:"frame-"+i});
    const frame=machineSetupFrame(s);
    pointNear(frame.z_axis,p(0,0,1),"frame handedness");
    const q=p(o.x+i/13,o.y-i/17,o.z+i/19);
    const machinePoint=worldToMachinePoint(q,s);
    const world=machineToWorldPoint(machinePoint,s);
    pointNear(world,q,"round-trip point");
    assert.equal(validateMachineSetup(s).ok,true);
    assert.ok(Object.isFrozen(frame));
  });
}

// 500 setup feed offsets apply only to the first manufacturing bend.
for(let i=1;i<=500;i++){
  scenario("First-bend machine feed offset remains separate from nominal geometry "+i,()=>{
    const methods=["physical_end","clamp_point","feed_zero","custom"];
    const method=methods[(i-1)%methods.length];
    const offset=i/7,extension=i%23;
    const setup=createMachineSetup({
      id:"feed-"+i,name:"Feed setup",
      machine_profile_id:"machine",tooling_set_id:"tool",
      offset_method:method,offset_mm:offset,
      clamp_point_mm:offset+3,feed_zero_mm:offset-2,
      clamping_extensions:{start_mm:extension,end_mm:i%19}
    },{setupId:"feed-"+i});
    const applied=method==="clamp_point"?offset+3:method==="feed_zero"?offset-2:offset;
    near(resolvedSetupOffsetMm(setup),applied,"resolved machine setup offset");
    const nominal=100+i/3;
    near(setupFeedLength(nominal,setup,{firstBend:true}),
      nominal+extension+applied,"first bend feed");
    near(setupFeedLength(nominal,setup,{firstBend:false}),nominal,"following feed");
    assert.equal(validateMachineSetup(setup).ok,true);
  });
}

// 500 explicit machine-instance override cases.
for(let i=1;i<=500;i++){
  scenario("Effective machine limits respect explicit instance overrides "+i,()=>{
    const profile=machine(i),stock=4000+i,angle=90+i%80;
    const instance=createMachineInstance({
      id:"instance-"+i,name:"Unit "+i,machine_profile_id:profile.id,
      limit_overrides:{max_stock_length_mm:stock,max_bend_angle_deg:angle}
    },{instanceId:"instance-"+i});
    const limits=effectiveMachineLimits(profile,instance);
    near(limits.max_stock_length_mm,stock,"instance stock limit");
    near(limits.max_bend_angle_deg,angle,"instance angle limit");
    near(limits.max_diameter_mm,40,"profile diameter");
    near(limits.min_feed_mm,20,"profile min feed");
    assert.ok(Object.isFrozen(limits));
    assert.throws(()=>effectiveMachineLimits(machine(i+1000),instance),/does not belong/);
  });
}

// 550 tooling compatibility: unknown OD/wall must not become zero-size measurements.
for(let i=1;i<=550;i++){
  scenario("Tooling compatibility distinguishes missing geometry from conflicts "+i,()=>{
    const profile=machine(i),set=tooling(profile,i);
    const mode=i%5;
    const tube=mode===0?{od_mm:16,wall_mm:1,clr_mm:40}
      :mode===1?{od_mm:null,wall_mm:1,clr_mm:40}
      :mode===2?{od_mm:16,wall_mm:null,clr_mm:40}
      :mode===3?{od_mm:18,wall_mm:1,clr_mm:40}
      :{od_mm:16,wall_mm:1,clr_mm:45};
    const report=evaluateToolingCompatibility({machineProfile:profile,toolingSet:set,tube});
    const expected=mode===0?"Compatible":mode<3?"Conditional":"Incompatible";
    assert.equal(report.status,expected);
    if(mode===1)assert.match(report.warnings.join(" "),/OD is unresolved/);
    if(mode===2)assert.match(report.warnings.join(" "),/wall thickness is unresolved/);
    if(mode>=3)assert.ok(report.reasons.length>0);
    if(mode===0)assert.deepEqual(report.reasons,[]);
    assert.ok(Object.isFrozen(report));
  });
}

// 550 trim plans: preserve nominal geometry while computing P1/P2 stock removal.
for(let i=1;i<=550;i++){
  scenario("End-trim plan uses P1/P2 manufacturing allowances only "+i,()=>{
    const start=i%21,end=i%17,firstClamp=i%19,lastClamp=i%23,
      startCut=i%9,endCut=i%7;
    const plan=buildRequiredEndTrimPlan({
      end_allowances:{startAllowance:start,endAllowance:end},
      setup_extensions:{start_mm:firstClamp,end_mm:lastClamp},
      cut_allowances:{start_mm:startCut,end_mm:endCut}
    });
    const a=start+firstClamp+startCut,b=end+lastClamp+endCut;
    near(plan.operations[0].remove_length_mm,a,"P1 trim");
    near(plan.operations[1].remove_length_mm,b,"P2 trim");
    near(plan.required_removal_mm,a+b,"total trim");
    const stock=1000+i;
    near(stockLengthAfterTrim(stock,plan),stock-a-b,"stock after trim");
    assert.equal(plan.nominal_geometry_changed,false);
    assert.ok(plan.operations.every(x=>x.manufacturing_only&&x.nominal_geometry_changed===false));
    assert.equal(validateTrimPlan(plan).ok,true);
  });
}

// 500 clearance monitor statuses, including missing data and disabled monitors.
for(let i=1;i<=500;i++){
  scenario("Clearance monitor respects minimum and warning thresholds "+i,()=>{
    const minimum=1+i%9,warning=minimum+3;
    const disabled=i%11===0;
    const monitor=createClearanceMonitor({
      id:"clearance-"+i,name:"Tube to fixture",
      members:[{kind:"tube",id:"tube-"+i},{kind:"fixture",id:"fixture-"+i}],
      minimum_clearance_mm:minimum,warning_clearance_mm:warning,enabled:!disabled
    },{monitorId:"clearance-"+i});
    const mode=i%4;
    const distance=mode===0?null:mode===1?minimum-0.5:mode===2?minimum+1:warning+1;
    const expected=mode===0?ClearanceStatus.NOT_CHECKED:
      mode===1?ClearanceStatus.RED:mode===2?ClearanceStatus.YELLOW:ClearanceStatus.GREEN;
    const classified=classifyClearance(distance,monitor);
    assert.equal(classified.status,expected);
    const result=evaluateClearanceMonitor(monitor,{distance_mm:distance});
    assert.equal(result.status,disabled?ClearanceStatus.NOT_CHECKED:expected);
    const all=evaluateClearanceMonitors([monitor],{[monitor.id]:{distance_mm:distance}});
    assert.equal(all.results.length,1);
    assert.equal(all.results[0].status,result.status);
    assert.ok(Object.isFrozen(result));
  });
}

// 550 collision evidence must distinguish OK, warning, collision and impossible.
for(let i=1;i<=550;i++){
  scenario("Bending simulation records per-bend collision evidence and release gate "+i,()=>{
    const bend={bend:1,elementId:"bend-"+i,C:90,commandAngle:95};
    const mode=i%5;
    const observations=mode===0?[]
      :mode===1?[{bend_id:bend.elementId,kind:"machine",clearance_mm:20}]
      :mode===2?[{bend_id:bend.elementId,kind:"tooling",clearance_mm:3}]
      :mode===3?[{bend_id:bend.elementId,kind:"fixture",collision:true,clearance_mm:-1}]
      :[{bend_id:bend.elementId,kind:"machine",impossible:true,clearance_mm:-2}];
    const expected=[
      SimulationCollisionStatus.NOT_CHECKED,SimulationCollisionStatus.OK,
      SimulationCollisionStatus.WARNING,SimulationCollisionStatus.COLLISION,
      SimulationCollisionStatus.IMPOSSIBLE
    ][mode];
    const classified=classifyBendSimulationStep(bend,observations,{warning_clearance_mm:5});
    assert.equal(classified.status,expected);
    const report=analyzeBendingSimulation([bend],observations,{warning_clearance_mm:5});
    assert.equal(report.status,expected);
    assert.equal(report.fully_checked,mode!==0);
    const lock=simulationModeDecision(report,SimulationCollisionMode.VALIDATION_LOCK);
    assert.equal(lock.release_blocked,mode===0||mode>=3);
    assert.equal(lock.can_continue,mode<3);
    const monitor=simulationModeDecision(report,SimulationCollisionMode.MONITOR);
    assert.equal(monitor.can_continue,true);
    assert.equal(monitor.release_blocked,false);
    assert.equal(bend.C,90);
    assert.equal(bend.commandAngle,95);
  });
}

// 500 developed length confirmations against independent source metadata.
for(let i=1;i<=500;i++){
  scenario("Developed tube length compares analytic arcs against source metadata "+i,()=>{
    const lineA=15+i%101, lineB=20+i%97;
    const radius=(i%37+1)*1.5, angle=(i%11+1)*15*(i%2===0?1:-1);
    const primitives=[
      {type:"LINE",length_mm:lineA},
      {type:"BEND",clr_mm:radius,signed_sweep_deg:angle},
      {type:"LINE",length_mm:lineB}
    ];
    const expected=lineA+lineB+radius*Math.abs(angle)*Math.PI/180;
    const computed=computePrimitiveDevelopedLength(primitives);
    near(computed.developed_length_mm,expected,"developed length");
    near(centerlineLength([
      {type:"LINE",length:lineA},{type:"BEND",clr:radius,angle},
      {type:"LINE",length:lineB}
    ]),expected,"canonical centerline");
    const match=validateDevelopedLengthConsistency(primitives,expected,{tolerance_mm:0.01});
    assert.equal(match.status,"passed");
    assert.equal(match.production_ready,false);
    const mismatch=validateDevelopedLengthConsistency(primitives,expected+0.2,{tolerance_mm:0.01});
    assert.equal(mismatch.status,"violation");
    near(mismatch.absolute_error_mm,0.2,"explicit source discrepancy");
    assert.ok(Object.isFrozen(computed.contributions));
  });
}

// 400 missing lengths are not zero and cannot become authoritative geometry.
for(let i=1;i<=400;i++){
  scenario("Absent or ambiguous developed lengths fail closed "+i,()=>{
    const ambiguous=[null,undefined,"","  ",false,true,[],{}][i%8];
    assert.throws(
      ()=>computePrimitiveDevelopedLength([{type:"LINE",length_mm:ambiguous}]),
      /finite non-negative number/
    );
    assert.throws(
      ()=>validateDevelopedLengthConsistency([{type:"LINE",length_mm:10}],ambiguous),
      /finite non-negative number/
    );
    const genuineZero=computePrimitiveDevelopedLength([{type:"LINE",length_mm:0}]);
    assert.equal(genuineZero.developed_length_mm,0);
    assert.equal(genuineZero.production_ready,false);
  });
}

// 400 invalid production constraints must never silently become valid.
for(let i=1;i<=400;i++){
  scenario("Invalid trimming, tooling and setup inputs are rejected "+i,()=>{
    assert.throws(()=>createTrimOperation({end:"P1",remove_length_mm:-i}),RangeError);
    assert.throws(()=>createMachineSetup({
      id:"bad-"+i,name:"Bad",clamping_extensions:{start_mm:-i,end_mm:0}
    }),RangeError);
    const profile=machine(i);
    const bad=createToolingSet({
      name:"Invalid wall range",compatible_machine_profile_ids:[profile.id],
      diameter_mm:16,wall_min_mm:2,wall_max_mm:1,clr_mm:40
    });
    assert.equal(validateToolingSet(bad).ok,false);
    assert.match(validateToolingSet(bad).errors.join(" "),/wall_min_mm/);
  });
}
assert.equal(registered,TOTAL,"Regression suite must register exactly 5,050 tests");
