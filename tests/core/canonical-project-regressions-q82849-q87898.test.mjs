import test from "node:test";
import assert from "node:assert/strict";
import {evaluateCanonicalPromotion} from "../../src/recognition/canonical-promotion.mjs";
import {validateCandidateTopology} from "../../src/recognition/topology-validation.mjs";
import {buildNeutralBendSequence} from "../../src/recognition/neutral-bend-sequence.mjs";
import {
  createSelectionSet, createDynamicSelectionSet, renameSelectionSet,
  evaluateDynamicSelectionSet, selectionSetById
} from "../../src/domain/project/selection-sets.mjs";
import {
  SYSTEM_LAYER_IDS, ensureLayerState,createUserLayer,assignObjectLayer,
  layerPermission, layerVisibility,resolveObjectStyle,setActiveLayer
} from "../../src/domain/project/layers.mjs";
import {
  createGeometryFitEvidence,normalizeGeometryToleranceProfile,
  recognitionSettingsFromToleranceProfile
} from "../../src/domain/geometry/tolerance-profile.mjs";

/**
 * q82849–q87898: 5,050 deterministic executable regression scenarios.
 * IDs continue a test-scenario counter, not the product requirement count.
 * Canonical nominal geometry and machine compensation must stay separate.
 */
const FIRST=82849,EXPECTED=5050;let count=0;
function scenario(name,fn){test("q"+(FIRST+count++)+": "+name,fn);}
function near(a,b,label){assert.ok(Number.isFinite(a),label+" must be finite");assert.ok(Math.abs(a-b)<=1e-8*Math.max(1,Math.abs(b)),label+": "+a+" != "+b);}
const X=[1,0,0],Y=[0,1,0],Z=[0,0,1];
function tubePrimitives({gap=0,tangentStart=X,straightBefore=25,tail=30,clr=10,sweep=90,plane=Z}={}){
  return [
    {type:"LINE",start:[-straightBefore,0,0],end:[0,0,0],direction:X,length_mm:straightBefore},
    {type:"BEND",start_point:[gap,0,0],end_point:[10,10,0],
      tangent_start:tangentStart,tangent_end:Y,plane_normal:plane,
      signed_sweep_deg:sweep,clr_mm:clr},
    {type:"LINE",start:[10,10,0],end:[10,10+tail,0],direction:Y,length_mm:tail}
  ];
}
function promotionFixture(i){
  const scale=1+i%17/5;
  return {
    geometry:{status:"geometry_candidate",include_library:"?Include Library/part-"+i,
      source_scale_status:"explicit_source",source_scale_mm_per_source_unit:scale,
      topology:{status:"candidate_valid"},
      length_consistency:{status:"passed",reconstructed_developed_length_mm:200+i/7},
      neutral_bend_sequence:{status:"candidate",bend_count:i%6+1},
      segmentation:{primitive_count:2*(i%6+1)+1},
      machine_compensation_applied:false},
    descriptor:{status:"exact",w3d:{scale_mm_per_source_unit:scale,polygon_handedness:"right"}},
    transform_provenance:{status:"rigid_placement",
      intrinsic_geometry_invariants_preserved:true,transform_count:i%4}
  };
}

// 900: canonical promotion demands exact scale, length, provenance and zero compensation.
for(let i=1;i<=900;i++){
  scenario("canonical promotion rejects unsupported provenance / compensation case "+i,()=>{
    const f=promotionFixture(i),mode=i%6;
    if(mode===1)f.geometry.source_scale_status="derived_fallback";
    if(mode===2)f.geometry.source_scale_mm_per_source_unit+=0.01;
    if(mode===3)f.geometry.machine_compensation_applied=true;
    if(mode===4)f.transform_provenance.status="unresolved";
    if(mode===5)f.geometry.length_consistency.status="violation";
    const result=evaluateCanonicalPromotion(f),allowed=mode===0;
    assert.equal(result.canonical_ready,allowed);
    assert.equal(result.status,allowed?"canonical_candidate":"blocked");
    assert.equal(result.production_ready,false);
    assert.equal(result.truth_category,"derived");
    assert.equal(result.bend_count,i%6+1);
    assert.equal(result.primitive_count,2*(i%6+1)+1);
    near(result.source_scale_mm_per_source_unit,f.descriptor.w3d.scale_mm_per_source_unit,"exact descriptor scale");
    assert.equal(result.blockers.length,allowed?0:1);
    assert.ok(Object.isFrozen(result.blockers));
  });
}

// 750: endpoint continuity is a strict tolerance check.
for(let i=1;i<=750;i++){
  scenario("LINE/BEND/LINE candidate endpoint continuity case "+i,()=>{
    const gap=i%2===0?0:0.25+(i%31)/13;
    const input=tubePrimitives({gap});
    const before=structuredClone(input);
    const report=validateCandidateTopology(input,{endpoint_tolerance_mm:0.1,tangent_angle_tolerance_deg:0.25});
    const allowed=gap===0;
    assert.equal(report.status,allowed?"candidate_valid":"violation");
    assert.equal(report.canonical_ready,allowed);
    assert.equal(report.production_ready,false);
    assert.equal(report.issues.some(e=>e.code==="ENDPOINT_GAP"),!allowed);
    assert.deepEqual(input,before,"topology check must not alter imported source evidence");
    assert.ok(Object.isFrozen(report.issues));
  });
}

// 650: tangent continuity cannot be substituted by nearby endpoints.
for(let i=1;i<=650;i++){
  scenario("tangent discontinuities require resampling instead of silent acceptance case "+i,()=>{
    const tangent=i%2===0?X:Y;
    const report=validateCandidateTopology(tubePrimitives({tangentStart:tangent}),{
      endpoint_tolerance_mm:0.1,tangent_angle_tolerance_deg:0.5
    });
    const allowed=i%2===0;
    assert.equal(report.status,allowed?"candidate_valid":"violation");
    assert.equal(report.canonical_ready,allowed);
    assert.equal(report.issues.some(x=>x.code==="TANGENCY_MISMATCH"),!allowed);
    assert.equal(report.issues.some(x=>x.code==="ENDPOINT_GAP"),false);
  });
}

// 700: technology-neutral bend sequence preserves signed source geometry.
for(let i=1;i<=700;i++){
  scenario("neutral bend sequence preserves feed CLR sign and uncompensated geometry "+i,()=>{
    const length=10+i/9,tail=12+i/11,clr=6.35+i/25;
    const sweep=i%2===0?90:-90,normal=i%2===0?Z:[0,0,-1];
    const inputs=tubePrimitives({straightBefore:length,tail,clr,sweep,plane:normal});
    const result=buildNeutralBendSequence(inputs);
    assert.equal(result.status,"candidate");
    assert.equal(result.bend_count,1);
    assert.equal(result.machine_compensation_applied,false);
    assert.equal(result.production_ready,false);
    assert.equal(result.canonical_ready,false);
    const bend=result.bends[0];
    near(bend.straight_before_mm,length,"nominal straight feed");
    near(bend.clr_mm,clr,"source centerline radius");
    near(bend.signed_bend_angle_deg,sweep,"signed bend angle");
    near(bend.bend_angle_deg,90,"absolute nominal bend angle");
    assert.equal(bend.rotation_from_previous_bend_deg,null);
    assert.deepEqual(bend.plane_normal,Z,"oriented positive plane normal");
    near(result.tail_length_mm,tail,"final straight length");
    assert.ok(Object.isFrozen(result.bends));
  });
}

// 700: evaluate live Dynamic Selection Sets, including deduplication and nested rules.
for(let i=1;i<=700;i++){
  scenario("Dynamic Selection Sets recalculate from current candidates case "+i,()=>{
    const mode=i%3;
    const project={};
    const set=createDynamicSelectionSet(project,{
      id:"dynamic-"+i,name:"Dynamic "+i,
      rules:mode===0?{match:"all",rules:[
        {field:"kind",operator:"eq",value:"tube"},
        {field:"layer_id",operator:"eq",value:"layer-copper"}
      ]}:mode===1?{match:"any",rules:[
        {field:"name",operator:"contains",value:"feed"},
        {field:"group_ids",operator:"in",value:["g2"]}
      ]}:{match:"all",rules:[
        {field:"kind",operator:"eq",value:"tube"},
        {field:"metadata.verified",operator:"truthy",value:true}
      ]}
    });
    const candidates=[
      {ref:{kind:"tube",id:"t1"},kind:"tube",layer_id:"layer-copper",name:"Feed line",group_ids:[],metadata:{verified:true}},
      {ref:{kind:"tube",id:"t2"},kind:"tube",layer_id:"layer-other",name:"Return",group_ids:["g2"],metadata:{verified:false}},
      {ref:{kind:"tube",id:"t3"},kind:"tube",layer_id:"layer-other",name:"Drain",group_ids:["g3"],metadata:{verified:true}},
      {ref:{kind:"tube",id:"t1"},kind:"tube",layer_id:"layer-copper",name:"Feed line",group_ids:[],metadata:{verified:true}}
    ];
    const ids=evaluateDynamicSelectionSet(set,candidates).map(x=>x.id);
    assert.deepEqual(ids,mode===0?["t1"]:mode===1?["t1","t2"]:["t1","t3"]);
    assert.equal("members" in set,false);
    assert.equal(project.selection_sets.length,1);
  });
}

// 500: invalid static set creation and duplicate renames are atomic.
for(let i=1;i<=500;i++){
  scenario("Static Selection Set validation cannot partially modify project case "+i,()=>{
    const project={},first=createSelectionSet(project,{
      id:"first-"+i,name:"Primary "+i,members:[{kind:"tube",id:"tube-"+i}]
    });
    assert.throws(()=>createSelectionSet(project,{
      id:"invalid-"+i,name:"Incomplete "+i,
      members:[{kind:"tube",id:"other-"+i},{kind:"UNSUPPORTED",id:"invalid"}]
    }),/unsupported Selection Set member kind/);
    assert.equal(project.selection_sets.length,1,"failed creation must roll back");
    assert.equal(selectionSetById(project,"invalid-"+i),null);
    const other=createSelectionSet(project,{id:"second-"+i,name:"Secondary "+i});
    const before=first.name;
    assert.throws(()=>renameSelectionSet(project,first.id,"  secondary "+i+" "),/name already exists/);
    assert.equal(first.name,before,"failed rename must not mutate original name");
    assert.equal(project.selection_sets.length,2);
    assert.equal(other.name,"Secondary "+i);
    renameSelectionSet(project,first.id,"Reviewed "+i);
    assert.equal(first.name,"Reviewed "+i);
  });
}

// 350: layer metadata and per-object style overrides must resolve deterministically.
for(let i=1;i<=350;i++){
  scenario("layer and object style provenance remains explicit case "+i,()=>{
    const project={},layers=ensureLayerState(project);
    assert.ok(layers.some(x=>x.id===SYSTEM_LAYER_IDS.tubes));
    const color="#"+((i*7117)%16777216).toString(16).padStart(6,"0");
    const layer=createUserLayer(project,{
      id:"user-layer-"+i,name:"Layer "+i,color,linetype:"Dashed",lineweight_mm:0.35
    });
    const obj={id:"tube-"+i};
    assignObjectLayer(project,obj,layer.id);
    const inherited=resolveObjectStyle(project,obj);
    assert.equal(inherited.color,color);
    assert.equal(inherited.linetype,"Dashed");
    near(inherited.lineweight_mm,0.35,"inherited lineweight");
    assert.equal(inherited.overridden.color,false);
    obj.object_style={color:"#ABCDEF",linetype:"Dotted",lineweight_mm:0.4};
    const custom=resolveObjectStyle(project,obj);
    assert.equal(custom.layer_id,layer.id);
    assert.equal(custom.color,"#abcdef");
    assert.equal(custom.linetype,"Dotted");
    near(custom.lineweight_mm,0.4,"override lineweight");
    assert.equal(custom.overridden.color,true);
    assert.ok(Object.isFrozen(custom));
  });
}

// 300: locked vs frozen layers enforce different permissions.
for(let i=1;i<=300;i++){
  scenario("layer freeze/lock gates editing without corrupting view state case "+i,()=>{
    const mode=i%3,project={};
    const layer=createUserLayer(project,{
      id:"guard-"+i,name:"Guard "+i,
      locked:mode===1,frozen:mode===2
    });
    const obj={layer_id:layer.id};
    const edit=layerPermission(project,obj,"edit");
    const view=layerPermission(project,obj,"view");
    const vis=layerVisibility(project,obj);
    assert.equal(edit.allowed,mode===0);
    assert.equal(view.allowed,mode!==2);
    assert.equal(vis.visible,mode!==2);
    assert.equal(vis.snappable,mode!==2);
    assert.equal(edit.code,mode===2?"LAYER_FROZEN":mode===1?"LAYER_LOCKED":"LAYER_ALLOWED");
    if(mode===2)assert.throws(()=>setActiveLayer(project,layer.id),/Frozen layer cannot be active/);
    else assert.equal(setActiveLayer(project,layer.id).id,layer.id);
  });
}

// 200: fitted evidence and visual capture radius are kept separate.
for(let i=1;i<=200;i++){
  scenario("fitted geometric evidence records tolerance without promoting production case "+i,()=>{
    const tolerance=0.1+(i%29)/100, error=tolerance/2, radius=6+i%19;
    const profile=normalizeGeometryToleranceProfile({
      circle_arc_fit_tolerance_mm:tolerance,
      linear_tolerance_mm:error/2,cursor_capture_radius_px:radius
    });
    const recog=recognitionSettingsFromToleranceProfile(profile);
    near(recog.arc_radial_tolerance_mm,tolerance,"recognition tolerance");
    assert.equal("cursor_capture_radius_px" in recog,false);
    const data={source:"mesh",element:i};
    const fit=createGeometryFitEvidence({
      mode:"Fitted",fitting_error_mm:error,tolerance_mm:tolerance,evidence:[data]
    });
    near(fit.confidence,0.5,"inferred confidence");
    assert.equal(fit.geometry_status,"Fitted");
    assert.equal(fit.fitting_error.mm,error);
    assert.notStrictEqual(fit.evidence[0],data);
    assert.ok(Object.isFrozen(fit.evidence));
  });
}
assert.equal(count,EXPECTED,"Must register 5,050 executable regression scenarios");
