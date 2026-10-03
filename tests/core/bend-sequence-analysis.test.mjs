import test from "node:test";
import assert from "node:assert/strict";

import {
  analyzeSequence,
  analyzeSequenceCandidates,
  applyChosenSequence,
  generateSequenceCandidates,
  normalizeSequenceSteps,
  scoreSequence
} from "../../src/domain/manufacturing/bend-sequence-analysis.mjs";

const steps=[
  {bend:1,elementId:"b1",Y:100,B:0,C:90,commandAngle:94.5,clearance_mm:25},
  {bend:2,elementId:"b2",Y:80,B:90,C:45,commandAngle:47.25,clearance_mm:15},
  {bend:3,elementId:"b3",Y:60,B:-90,C:30,commandAngle:31.5,clearance_mm:20}
];

test("sequence normalization preserves stable bend identity and machine values",()=>{
  const out=normalizeSequenceSteps(steps);
  assert.deepEqual(out.map(x=>x.id),["b1","b2","b3"]);
  assert.equal(out[1].rotation_deg,90);
  assert.equal(out[1].command_angle_deg,47.25);
});

test("candidate generation never silently changes the current forward order",()=>{
  const out=generateSequenceCandidates(steps,{allow_reverse:true});
  assert.deepEqual(out[0].order,["b1","b2","b3"]);
  assert.equal(out[0].source,"default");
  assert.deepEqual(out[1].order,["b3","b2","b1"]);
  assert.equal(out[1].source,"reverse");
});

test("precedence rules suppress candidates that violate technology order",()=>{
  const out=generateSequenceCandidates(steps,{
    allow_reverse:true,
    precedence_edges:[{before:"b1",after:"b3"}]
  });
  assert.equal(out.length,1);
  assert.deepEqual(out[0].order,["b1","b2","b3"]);
});

test("explicit candidate orders are accepted only when complete and unique",()=>{
  const out=generateSequenceCandidates(steps,{
    allow_reverse:false,
    explicit_orders:[
      ["b2","b1","b3"],
      ["b2","b1","b3"],
      ["b1","b2"]
    ]
  });
  assert.deepEqual(out.map(x=>x.order),[
    ["b1","b2","b3"],
    ["b2","b1","b3"]
  ]);
});

test("sequence analysis reports machine limit violations and clearance metrics",()=>{
  const candidate=generateSequenceCandidates(steps,{allow_reverse:false})[0];
  const result=analyzeSequence(steps,candidate,{
    machine_limits:{max_bend_angle_deg:93,rotation_limit_deg:360,min_feed_mm:50}
  });
  assert.equal(result.valid,false);
  assert.match(result.violations.join(" "),/angle exceeds machine limit/);
  assert.equal(result.metrics.min_clearance_mm,15);
  assert.equal(result.metrics.total_rotation_deg,180);
});

test("sequence metrics count only explicit regrip and flip evidence",()=>{
  const marked=[
    {...steps[0],requires_regrip:true},
    {...steps[1],requires_flip:true},
    steps[2]
  ];
  const candidate=generateSequenceCandidates(marked,{allow_reverse:false})[0];
  const result=analyzeSequence(marked,candidate);
  assert.equal(result.metrics.regrips,1);
  assert.equal(result.metrics.flips,1);
});

test("priority scoring can prefer lower rotation without auto-applying it",()=>{
  const a={valid:true,metrics:{regrips:0,flips:0,total_rotation_deg:90,total_feed_mm:300,min_clearance_mm:20},warnings:[]};
  const b={valid:true,metrics:{regrips:0,flips:0,total_rotation_deg:180,total_feed_mm:300,min_clearance_mm:20},warnings:[]};
  assert.ok(scoreSequence(a,{rotation:1})<scoreSequence(b,{rotation:1}));
});

test("candidate analysis returns ranked suggestions but leaves selection explicit",()=>{
  const result=analyzeSequenceCandidates(steps,{allow_reverse:true,priorities:{rotation:1}});
  assert.equal(result.length,2);
  assert.deepEqual(result.map(x=>x.suggestion_rank),[1,2]);
  assert.ok(result.every(x=>!("chosen" in x)));
});

test("chosen sequence can be applied only through an explicit valid analysis",()=>{
  const result=analyzeSequenceCandidates(steps,{allow_reverse:true})[0];
  const applied=applyChosenSequence(steps,result);
  assert.equal(applied.chosen_sequence.chosen_explicitly,true);
  assert.deepEqual(applied.steps.map(x=>x.id),result.order);
  assert.throws(()=>applyChosenSequence(steps,{valid:false,order:["b1","b2","b3"]}),/invalid bend sequence/);
});

test("collision callback can invalidate one sequence without changing steps",()=>{
  const candidate=generateSequenceCandidates(steps,{allow_reverse:false})[0];
  const result=analyzeSequence(steps,candidate,{
    collision_check:({index})=>index===1?{collision:true,message:"fixture collision",clearance_mm:-2}:{clearance_mm:10}
  });
  assert.equal(result.valid,false);
  assert.equal(result.metrics.collisions,1);
  assert.equal(result.metrics.min_clearance_mm,-2);
  assert.match(result.violations.join(" "),/fixture collision/);
});
