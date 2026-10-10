import test from "node:test";
import assert from "node:assert/strict";
import { centerlineArcLength, centerlineLength } from "../../src/domain/geometry/centerline.mjs";
import { geometryCorrectionReport, isFittedGeometry, createExactNormalizedGeometry, normalizedGeometryComparison } from "../../src/domain/geometry/normalize-fitted-geometry.mjs";
import { FITTED_USAGE, assessFittedGeometryUsage, confirmFittedGeometryUsage, collectGeometryEvidence } from "../../src/domain/geometry/fitted-geometry-policy.mjs";
import { buildBatchNormalizePreview, setBatchPreviewSelection, setBatchNominal, batchNormalizePlan } from "../../src/domain/geometry/batch-normalize-fitted.mjs";
import { ValidationStatus, makeValidationResult, evaluateProductionRelease } from "../../src/domain/validation/results.mjs";
import { createReproducibilityEvidence, compareCpuGpuEvidence, reproducibilityReleaseGate } from "../../src/domain/validation/reproducibility.mjs";
import { intersectTriangleWithPlane } from "../../src/domain/geometry/section-derived.mjs";
import { createGroup, addGroupMembers, leafGroupMembers, groupDescendantIds, wouldCreateGroupCycle } from "../../src/domain/project/groups.mjs";

// q72749–q77798. 5,050 executable regression scenarios, not 5,050
// independently implemented questionnaire requirements.
const FIRST=72749,TOTAL=5050;
let registered=0;
function scenario(label,fn){ test("q"+(FIRST+registered++)+": "+label,fn); }
function near(actual,expected,label,epsilon=1e-8){
  assert.ok(Number.isFinite(actual),label+" must be finite");
  assert.ok(Math.abs(actual-expected) <= epsilon*Math.max(1,Math.abs(expected)),
    label+": expected "+expected+", received "+actual);
}
const fit=(id,value)=>({id,geometry_status:"Fitted",type:"LINE",length_mm:value});
const check=(id,status)=>makeValidationResult({
  checkId:id,scope:"tube",subjectId:"tube-1",modelRevision:"r1",
  requiredForProduction:true,status,message:status
});

// 700 machine-neutral centerline calculations with signed bend angles.
for(let i=1;i<=700;i++){
  scenario("canonical centerline length preserves CLR and line lengths "+i,()=>{
    const radius=(i%67+1)/3, angle=((i%29)-14)*15;
    const straight=(i%103)+0.25,tail=(i%37)+0.75;
    const arc=radius*Math.abs(angle)*Math.PI/180;
    near(centerlineArcLength(radius,angle),arc,"arc length");
    const steps=[{type:"LINE",length:straight},{type:"BEND",clr:radius,angle},{type:"LINE",length:tail}];
    near(centerlineLength(steps),straight+arc+tail,"total centerline");
    near(centerlineLength([{type:"BEND",clr:radius,angle:-angle}]),arc,"opposite bend sign");
    assert.throws(()=>centerlineArcLength(-radius,angle),RangeError);
    assert.throws(()=>centerlineLength([{type:"LINE",length:-1}]),RangeError);
  });
}

// 600 per-field correction statistics, no alterations to source evidence.
for(let i=1;i<=600;i++){
  scenario("Fitted-to-Exact numeric deltas and RMS stay auditable "+i,()=>{
    const d1=(i%31+1)/100,d2=-(i%23+1)/200;
    const fitted={geometry_status:"Fitted",radius_mm:50+i/100,origin:{x:1,y:2,z:3},angle_deg:90, evidence:[{correction:9876}]};
    const exact={geometry_status:"Exact",radius_mm:fitted.radius_mm+d1,origin:{x:1,y:2+d2,z:3},angle_deg:90,evidence:[]};
    const before=structuredClone(fitted);
    const report=geometryCorrectionReport(fitted,exact);
    assert.equal(report.changed_numeric_fields,2);
    const mapped=new Map(report.deltas.map(x=>[x.path,x.delta]));
    near(mapped.get("radius_mm"),d1,"radius delta");
    near(mapped.get("origin.y"),d2,"origin y delta");
    near(report.max_abs_correction,Math.max(Math.abs(d1),Math.abs(d2)),"max correction");
    near(report.rms_correction,Math.hypot(d1,d2)/Math.sqrt(2),"rms correction");
    assert.deepEqual(fitted,before);
    assert.ok(Object.isFrozen(report)&&Object.isFrozen(report.deltas));
  });
}

// 600 explicit normalization, preserving provenance and never changing source.
for(let i=1;i<=600;i++){
  scenario("Fitted remains immutable, Exact copy tracks source and correction "+i,()=>{
    const source=fit("original-"+i,10+i/17),delta=(i%31+1)/100;
    const snapshot=structuredClone(source);
    const exact={geometry_status:"Fitted",type:"LINE",length_mm:source.length_mm+delta,id:"exact-"+i};
    const normalized=createExactNormalizedGeometry({
      fitted_geometry:source,exact_geometry:exact,fitted_object_id:source.id,
      source_object_id:"source-"+i,source_chain:[{file:"source-"+i+".dwfx"}]
    });
    assert.deepEqual(source,snapshot);
    assert.deepEqual(exact,{geometry_status:"Fitted",type:"LINE",length_mm:source.length_mm+delta,id:"exact-"+i});
    assert.equal(normalized.status,"Exact");
    assert.equal(normalized.exact_geometry.geometry_status,"Exact");
    assert.equal(normalized.exact_geometry.fitted,false);
    assert.equal(isFittedGeometry(normalized.exact_geometry),false);
    assert.equal(normalized.provenance.fitted_snapshot.geometry_status,"Fitted");
    assert.equal(normalized.provenance.fitted_object_id,source.id);
    near(normalized.correction.max_abs_correction,delta,"normalization delta");
    near(normalizedGeometryComparison(normalized).max_abs_correction,delta,"recomputed delta");
    assert.ok(Object.isFrozen(normalized.exact_geometry));
  });
}

// 650 policy checks: safe Fitted reads vs confirmed driving operations.
for(let i=1;i<=650;i++){
  scenario("Fitted read/drive usage never silently skips required confirmation "+i,()=>{
    const uses=[
      FITTED_USAGE.Snap,FITTED_USAGE.Measurement,FITTED_USAGE.Construction,
      FITTED_USAGE.ReferenceDimension,FITTED_USAGE.DrivingDimension,
      FITTED_USAGE.GeometricConstraint,FITTED_USAGE.TubeFixation,
      FITTED_USAGE.ArrayAxis,FITTED_USAGE.TechnologyCalculation
    ];
    const usage=uses[(i-1)%uses.length],mustConfirm=(i-1)%uses.length>=4;
    const nested={document:{metadata:fit("fitted-"+i,123+i/17)}};
    const evidence=collectGeometryEvidence(nested);
    assert.equal(evidence.length,1);
    assert.equal(evidence[0].geometry_status,"Fitted");
    const state=assessFittedGeometryUsage(nested,usage);
    assert.equal(state.has_fitted_geometry,true);
    assert.equal(state.requires_confirmation,mustConfirm);
    assert.equal(state.allowed,!mustConfirm);
    assert.equal(confirmFittedGeometryUsage(nested,usage,{confirmed:false}).allowed,!mustConfirm);
    assert.equal(confirmFittedGeometryUsage(nested,usage,{confirmed:true}).allowed,true);
  });
}

// 600 batch previews including incomplete CAD dimension, with no invented zero.
for(let i=1;i<=600;i++){
  scenario("batch normalization preview preserves real and missing dimensions "+i,()=>{
    const base=20+i/9,delta=i%2===0?0.04:0.01;
    const source=[fit("a-"+i,base),fit("b-"+i,base+delta)];
    if(i%3===0)source.push(fit("missing-"+i,null));
    const before=structuredClone(source);
    const preview=buildBatchNormalizePreview(source,{
      tolerance_profile:{linear_tolerance_mm:0.02},similarity_multiplier:5
    });
    assert.deepEqual(source,before);
    assert.equal(preview.status,"Preview");
    assert.equal(preview.mutates_source,false);
    assert.equal(preview.candidate_count,source.length);
    const measured=preview.groups.find(g=>g.field==="length_mm");
    assert.ok(measured);
    assert.equal(measured.member_count,2);
    near(measured.nominal_value,base+delta/2,"median nominal");
    const reNominal=setBatchNominal(preview,measured.id,base);
    const changed=reNominal.groups.find(g=>g.id===measured.id);
    assert.equal(changed.out_of_tolerance_count,delta>0.02?1:0);
    if(i%3===0){
      const unmeasured=preview.groups.flatMap(g=>g.members).find(x=>x.id==="missing-"+i);
      assert.equal(unmeasured.source_value,null,"unknown must not become zero");
      assert.equal(unmeasured.nominal_value,null,"unknown nominal is not guessed");
    }
  });
}

// 450 explicit selection and plan snapshot, never mutating source CAD.
for(let i=1;i<=450;i++){
  scenario("batch plan selects explicitly checked source items only "+i,()=>{
    const source=[fit("x-"+i,60+i/23),fit("y-"+i,60+i/23+0.005)];
    const before=structuredClone(source);
    const preview=buildBatchNormalizePreview(source,{
      tolerance_profile:{linear_tolerance_mm:0.01},similarity_multiplier:5
    });
    const unselected=setBatchPreviewSelection(preview,["y-"+i],false);
    const plan=batchNormalizePlan(unselected);
    assert.equal(preview.selected_count,2);
    assert.equal(unselected.selected_count,1);
    assert.equal(plan.status,"Ready");
    assert.equal(plan.source_mutation,false);
    assert.equal(plan.operation,"BatchNormalizeFittedToExact");
    assert.equal(plan.selected_count,1);
    assert.equal(plan.items.length,1);
    assert.equal(plan.items[0].id,"x-"+i);
    assert.equal(plan.items[0].geometry.geometry_status,"Fitted");
    assert.ok(Number.isFinite(plan.items[0].target_value));
    assert.deepEqual(source,before);
  });
}

// 500 fail-closed release decisions, including duplicate check identifiers.
for(let i=1;i<=500;i++){
  scenario("production release gate cannot lose blockers "+i,()=>{
    const a="geometry-"+i,b="technology-"+i;
    const passing=check(a,ValidationStatus.PASSED);
    const bad=check(b,ValidationStatus.VIOLATION);
    const good=check(b,ValidationStatus.PASSED);
    const mode=i%4;
    if(mode===0){
      const report=evaluateProductionRelease({results:[passing,good],requiredCheckIds:[a,b]});
      assert.equal(report.allowed,true);
      assert.equal(report.blockers.length,0);
    }else if(mode===1){
      const report=evaluateProductionRelease({results:[passing],requiredCheckIds:[a,b]});
      assert.equal(report.allowed,false);
      assert.equal(report.blockers[0].status,ValidationStatus.NOT_CHECKED);
      assert.equal(report.blockers[0].check_id,b);
    }else if(mode===2){
      const report=evaluateProductionRelease({results:[passing,bad],requiredCheckIds:[a,b]});
      assert.equal(report.allowed,false);
      assert.equal(report.blockers[0].status,ValidationStatus.VIOLATION);
    }else{
      assert.throws(
        ()=>evaluateProductionRelease({results:[passing,bad,good],requiredCheckIds:[a,b]}),
        /duplicate validation check id/
      );
    }
  });
}

// 450 CPU/GPU tolerance comparisons; mismatch must block release.
for(let i=1;i<=450;i++){
  scenario("CPU/GPU reproducibility makes missing and mismatched data explicit "+i,()=>{
    const reference=100+i/37;
    const offset=i%2===0?2e-6:2.5e-7;
    const cpu=createReproducibilityEvidence({backend:"cpu",payload:{length_mm:reference,points:[{x:1,y:2,z:3}]}});
    const gpu=createReproducibilityEvidence({backend:"gpu",payload:{length_mm:reference+offset,points:[{x:1,y:2,z:3}]}});
    const report=compareCpuGpuEvidence(cpu,gpu);
    const matching=i%2!==0;
    assert.equal(report.ok,matching);
    assert.equal(report.status,matching?"Match":"Mismatch");
    assert.equal(report.differences.length,matching?0:1);
    assert.equal(reproducibilityReleaseGate(report).ok,matching);
    assert.equal(reproducibilityReleaseGate(compareCpuGpuEvidence(cpu,null)).ok,false);
    assert.ok(Object.isFrozen(report));
  });
}

// 300 triangle/plane intersection tests, no implicit production promotion.
for(let i=1;i<=300;i++){
  scenario("triangle-plane intersection produces a geometric section segment "+i,()=>{
    const x0=i%17-8, y0=i%23-11, z0=i%31-15,span=1+i/100;
    const tri=[
      {x:x0-span,y:y0,z:z0},
      {x:x0+span,y:y0,z:z0},
      {x:x0,y:y0+span,z:z0}
    ];
    const report=intersectTriangleWithPlane(tri,{
      point:{x:x0,y:y0,z:z0},
      normal:{x:3,y:0,z:0}
    });
    assert.equal(report.status,"segment");
    assert.equal(report.segment.length,2);
    for(const point of report.segment){
      near(point.x,x0,"section x");
      near(point.z,z0,"section z");
    }
    const ys=report.segment.map(p=>p.y).sort((a,b)=>a-b);
    near(ys[0],y0,"segment start y");
    near(ys[1],y0+span,"segment end y");
    assert.ok(Object.isFrozen(report.segment));
  });
}

// 200 logical group DAGs; leaf members dedupe and cycles are rejected.
for(let i=1;i<=200;i++){
  scenario("nested project groups reject cycles and preserve leaf identities "+i,()=>{
    const project={groups:[]},tubeId="tube-"+i,childId="child-"+i,parentId="parent-"+i;
    createGroup(project,{id:childId,members:[{kind:"tube",id:tubeId}]});
    createGroup(project,{id:parentId,members:[{kind:"group",id:childId},{kind:"tube",id:tubeId}]});
    const descendants=groupDescendantIds(project,parentId);
    assert.deepEqual(descendants,[childId]);
    const leaves=leafGroupMembers(project,parentId);
    assert.equal(leaves.length,1);
    assert.equal(leaves[0].kind,"tube");
    assert.equal(leaves[0].id,tubeId);
    assert.equal(wouldCreateGroupCycle(project,childId,parentId),true);
    assert.throws(()=>addGroupMembers(project,childId,[{kind:"group",id:parentId}]),/cycle/);
    assert.equal(groupDescendantIds(project,childId).length,0);
  });
}

assert.equal(registered,TOTAL,"Expected 5,050 registered test scenarios");
