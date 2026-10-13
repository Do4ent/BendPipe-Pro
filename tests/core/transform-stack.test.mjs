import test from "node:test";
import assert from "node:assert/strict";

import {
  appendTransformOperation,
  applyTubeTransformStack,
  bakeTubeTransformStack,
  createMirrorOperation,
  createMoveOperation,
  createRotateOperation,
  createTubeTransformStack,
  removeTransformOperation,
  reorderTubeTransformOperation,
  replaceTransformOperation,
  setTransformOperationEnabled,
  summarizeTransformStack,
  transformStackFingerprint
} from "../../src/domain/editing/transform-stack.mjs";

function sample(){
  return {
    id:"tube-1",
    name:"Stack",
    origin:{x:10,y:20,z:30},
    startVector:{x:1,y:0,z:0},
    rows:[
      {type:"LINE",L:100,LFormula:"100",elementId:"e0"},
      {type:"BEND",angle:90,angleFormula:"90.00",plane:"XY",rot:20,rotFormula:"20.00",clr:50,elementId:"e1"},
      {type:"LINE",L:80,LFormula:"80",elementId:"e2"}
    ]
  };
}

test("transform stack stores immutable base geometry and explicit operation order",()=>{
  const tube=sample();
  const move=createMoveOperation({x:5,y:0,z:0},{id:"m1"});
  const rotate=createRotateOperation({axis:{x:0,y:0,z:1},center:{x:0,y:0,z:0},angle_deg:90,id:"r1"});
  const stack=createTubeTransformStack(tube,{id:"stack-1",operations:[move,rotate]});

  tube.origin.x=999;
  assert.equal(stack.base_tube.origin.x,10);
  assert.deepEqual(stack.operations.map((op)=>op.id),["m1","r1"]);
  assert.equal(stack.associative,true);
});

test("transform stack applies Move Rotate Mirror in explicit order without changing nominal scalars",()=>{
  let stack=createTubeTransformStack(sample(),{id:"stack-1"});
  stack=appendTransformOperation(stack,createMoveOperation({x:5,y:-2,z:3},{id:"m1"}));
  stack=appendTransformOperation(stack,createRotateOperation({
    id:"r1",axis:{x:0,y:0,z:1},center:{x:0,y:0,z:0},angle_deg:30
  }));
  stack=appendTransformOperation(stack,createMirrorOperation({
    id:"x1",plane_point:{x:0,y:0,z:0},plane_normal:{x:0,y:1,z:0}
  }));

  const result=applyTubeTransformStack(stack);
  assert.equal(result.status,"exact");
  assert.equal(result.right_handed_output,true);
  assert.equal(result.reflection_count,1);
  assert.deepEqual(
    result.tube.rows.filter((r)=>r.type==="LINE").map((r)=>r.L),
    [100,80]
  );
  assert.deepEqual(
    result.tube.rows.filter((r)=>r.type==="BEND").map((r)=>[r.angle,r.clr]),
    [[90,50]]
  );
});

test("disable preserves transform operation but skips it during evaluation",()=>{
  let stack=createTubeTransformStack(sample(),{
    operations:[createMoveOperation({x:100,y:0,z:0},{id:"move"})]
  });
  stack=setTransformOperationEnabled(stack,"move",false);
  const result=applyTubeTransformStack(stack);
  assert.equal(result.status,"exact");
  assert.equal(result.tube.origin.x,10);
  assert.equal(stack.operations[0].enabled,false);
});

test("reorder changes evaluated transform order",()=>{
  const move=createMoveOperation({x:10,y:0,z:0},{id:"move"});
  const rotate=createRotateOperation({axis:{x:0,y:0,z:1},center:{x:0,y:0,z:0},angle_deg:90,id:"rot"});
  let stack=createTubeTransformStack(sample(),{operations:[move,rotate]});
  const a=applyTubeTransformStack(stack);
  stack=reorderTubeTransformOperation(stack,1,0);
  const b=applyTubeTransformStack(stack);
  assert.notDeepEqual(a.tube.origin,b.tube.origin);
  assert.deepEqual(stack.operations.map((op)=>op.id),["rot","move"]);
});

test("replace and remove transform operations are explicit and preserve stack identity",()=>{
  let stack=createTubeTransformStack(sample(),{
    id:"stack-fixed",
    operations:[createMoveOperation({x:1,y:0,z:0},{id:"move"})]
  });
  stack=replaceTransformOperation(stack,"move",createMoveOperation({x:2,y:0,z:0},{id:"other"}));
  assert.equal(stack.id,"stack-fixed");
  assert.equal(stack.operations[0].id,"move");
  assert.equal(stack.operations[0].metadata.delta.x,2);
  stack=removeTransformOperation(stack,"move");
  assert.equal(stack.operations.length,0);
});

test("Bake returns independent right-handed geometry and leaves base snapshot untouched",()=>{
  let stack=createTubeTransformStack(sample(),{id:"stack-bake"});
  stack=appendTransformOperation(stack,createMirrorOperation({
    id:"mirror",plane_point:{x:0,y:0,z:0},plane_normal:{x:1,y:0,z:0}
  }));
  const before=structuredClone(stack.base_tube);
  const baked=bakeTubeTransformStack(stack);
  assert.equal(baked.status,"exact");
  assert.equal(baked.associative,false);
  assert.equal(baked.right_handed_output,true);
  assert.equal(baked.source_base_unchanged,true);
  assert.equal(baked.tube.transform_stack_baked,true);
  assert.equal("transform_stack" in baked.tube,false);
  assert.deepEqual(stack.base_tube,before);
});

test("transform stack fingerprint changes with parameters and summary reports kinds",()=>{
  const base=createTubeTransformStack(sample(),{
    id:"stack",
    operations:[createMoveOperation({x:1,y:0,z:0},{id:"move"})]
  });
  const changed=replaceTransformOperation(base,"move",createMoveOperation({x:2,y:0,z:0},{id:"x"}));
  assert.notEqual(transformStackFingerprint(base),transformStackFingerprint(changed));

  const summary=summarizeTransformStack(changed);
  assert.equal(summary.moves,1);
  assert.equal(summary.rotations,0);
  assert.equal(summary.mirrors,0);
  assert.deepEqual(summary.order,["move"]);
});

test("unsupported operation kinds fail closed",()=>{
  const stack=createTubeTransformStack(sample());
  assert.throws(
    ()=>appendTransformOperation(stack,{id:"scale",kind:"Scale",matrix:new Array(16).fill(0)}),
    /unsupported transform stack operation/
  );
});


test("question 68: disguised Scale or shear cannot enter a tube Transform Stack",()=>{
  const stack=createTubeTransformStack(sample());
  const uniformScale={
    id:"fake-move",
    kind:"Move",
    matrix:[
      2,0,0,0,
      0,2,0,0,
      0,0,2,0,
      0,0,0,1
    ],
    enabled:true,
    associative:true,
    metadata:{delta:{x:0,y:0,z:0}}
  };
  assert.throws(
    ()=>appendTransformOperation(stack,uniformScale),
    (error)=>error?.code==="NON_RIGID_TUBE_TRANSFORM"
  );
});
