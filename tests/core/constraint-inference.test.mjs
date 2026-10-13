import test from "node:test";
import assert from "node:assert/strict";
import {
  INFERENCE_TYPES,
  inferConstraintSuggestions,
  selectInferenceSuggestion,
  normalizeInferenceMode
} from "../../src/domain/constraints/constraint-inference.mjs";

const ref=(id)=>({object_id:id,subentity_id:id+"-sub"});

test("question 80: inference is limited to observable geometric relations and excludes Fixed types",()=>{
  assert.deepEqual(Array.from(INFERENCE_TYPES),[
    "Coincident","Collinear","Parallel","Perpendicular","Tangent","Concentric","Equal","Horizontal","Vertical"
  ]);
  assert.equal(INFERENCE_TYPES.some(type=>type.startsWith("Fixed")),false);
});

test("question 80: modes are explicit Off Suggest Auto",()=>{
  assert.equal(normalizeInferenceMode("Off"),"Off");
  assert.equal(normalizeInferenceMode("Suggest"),"Suggest");
  assert.equal(normalizeInferenceMode("Auto"),"Auto");
  assert.throws(()=>normalizeInferenceMode("Silent"),/Off, Suggest or Auto/);
});

test("question 80: Coincident inference uses point tolerance and confidence",()=>{
  const suggestions=inferConstraintSuggestions({
    references:[ref("a"),ref("b")],
    resolved:[{point:{x:0,y:0,z:0}},{point:{x:.05,y:0,z:0}}]
  });
  const hit=suggestions.find(item=>item.type==="Coincident");
  assert.ok(hit);
  assert.ok(hit.score>0.7);
  assert.equal(hit.requires_confirmation,true);
});

test("question 80: line relations infer Parallel Collinear Perpendicular Horizontal Vertical",()=>{
  const parallel=inferConstraintSuggestions({
    references:[ref("a"),ref("b")],
    resolved:[
      {point:{x:0,y:0,z:0},direction:{x:1,y:0,z:0}},
      {point:{x:10,y:0,z:0},direction:{x:-1,y:0,z:0}}
    ]
  }).map(item=>item.type);
  assert.ok(parallel.includes("Parallel"));
  assert.ok(parallel.includes("Collinear"));
  assert.ok(parallel.includes("Horizontal"));

  const perp=inferConstraintSuggestions({
    references:[ref("a"),ref("b")],
    resolved:[
      {direction:{x:1,y:0,z:0}},
      {direction:{x:0,y:1,z:0}}
    ]
  }).map(item=>item.type);
  assert.ok(perp.includes("Perpendicular"));
  assert.ok(perp.includes("Horizontal"));
  assert.ok(perp.includes("Vertical"));
});

test("question 80: circle and scalar relations infer Tangent Concentric Equal",()=>{
  const tangent=inferConstraintSuggestions({
    references:[ref("a"),ref("b")],
    resolved:[
      {center:{x:0,y:0,z:0},radius_mm:10},
      {center:{x:15,y:0,z:0},radius_mm:5}
    ]
  }).map(item=>item.type);
  assert.ok(tangent.includes("Tangent"));

  const concentricEqual=inferConstraintSuggestions({
    references:[ref("a"),ref("b")],
    resolved:[
      {center:{x:2,y:3,z:4},radius_mm:5,value:5},
      {center:{x:2,y:3,z:4},radius_mm:5,value:5}
    ]
  }).map(item=>item.type);
  assert.ok(concentricEqual.includes("Concentric"));
  assert.ok(concentricEqual.includes("Equal"));
});

test("question 80: best suggestion honors confidence and preferred type ordering",()=>{
  const suggestions=[
    {id:"p",type:"Parallel",score:.8},
    {id:"c",type:"Coincident",score:.9}
  ];
  assert.equal(selectInferenceSuggestion(suggestions)?.type,"Coincident");
  assert.equal(selectInferenceSuggestion(suggestions,{preferred_types:["Parallel"]})?.type,"Parallel");
  assert.equal(selectInferenceSuggestion(suggestions,{minimum_score:.95}),null);
});
