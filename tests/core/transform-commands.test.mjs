import test from "node:test";
import assert from "node:assert/strict";
import {
  arrayMemberTransforms,
  breakAssociativeArray,
  circularArrayTransforms,
  composeTransformStack,
  createAssociativeArray,
  createTransformOperation,
  linearArrayTransforms,
  matrixArrayTransforms,
  mirrorMatrix,
  moveByPoints,
  multiplyMatrices,
  reorderTransformStack,
  rotateTransform,
  rotationMatrix,
  suppressArrayMember,
  toggleTransformOperation,
  transformPoint,
  transformVector,
  translationMatrix
} from "../../src/domain/editing/transform-commands.mjs";

function near(a,b,tol=1e-9){
  for(const k of ["x","y","z"])assert.ok(Math.abs(a[k]-b[k])<=tol,`${k}: ${a[k]} vs ${b[k]}`);
}

test("move by snapped base and target points creates exact XYZ translation",()=>{
  const op=moveByPoints({x:1,y:2,z:3},{x:11,y:-3,z:8});
  assert.deepEqual(op.delta,{x:10,y:-5,z:5});
  near(transformPoint(op.matrix,{x:2,y:2,z:2}),{x:12,y:-3,z:7});
});

test("axis rotation preserves center and distance",()=>{
  const op=rotateTransform({axis:{x:0,y:0,z:1},center:{x:1,y:1,z:0},angle_deg:90});
  near(transformPoint(op.matrix,{x:2,y:1,z:0}),{x:1,y:2,z:0});
  near(transformPoint(op.matrix,{x:1,y:1,z:0}),{x:1,y:1,z:0});
});

test("rotation transforms vectors without applying translation",()=>{
  const m=rotationMatrix({axis:{x:0,y:0,z:1},center:{x:5,y:5,z:0},angle_deg:90});
  near(transformVector(m,{x:1,y:0,z:0}),{x:0,y:1,z:0});
});

test("mirror plane reflects points exactly and leaves in-plane points fixed",()=>{
  const m=mirrorMatrix({plane_point:{x:0,y:0,z:2},plane_normal:{x:0,y:0,z:1}});
  near(transformPoint(m,{x:3,y:4,z:5}),{x:3,y:4,z:-1});
  near(transformPoint(m,{x:-2,y:8,z:2}),{x:-2,y:8,z:2});
});

test("transform stack order is explicit and reorder changes result",()=>{
  const move=createTransformOperation({id:"move",kind:"Move",matrix:translationMatrix({x:10,y:0,z:0}),associative:true});
  const rotate=createTransformOperation({id:"rot",kind:"Rotate",matrix:rotationMatrix({axis:{x:0,y:0,z:1},angle_deg:90}),associative:true});
  const a=composeTransformStack([move,rotate]);
  near(transformPoint(a,{x:1,y:0,z:0}),{x:0,y:11,z:0});

  const reordered=reorderTransformStack([move,rotate],1,0);
  const b=composeTransformStack(reordered);
  near(transformPoint(b,{x:1,y:0,z:0}),{x:10,y:1,z:0});
});

test("disabled transform operation is ignored without deleting it",()=>{
  const move=createTransformOperation({id:"move",kind:"Move",matrix:translationMatrix({x:10,y:0,z:0}),associative:true});
  const off=toggleTransformOperation([move],"move",false);
  near(transformPoint(composeTransformStack(off),{x:1,y:2,z:3}),{x:1,y:2,z:3});
  assert.equal(off[0].enabled,false);
});

test("linear array includes source member at index zero",()=>{
  const list=linearArrayTransforms({count:4,step:25,direction:{x:1,y:0,z:0}});
  assert.equal(list.length,4);
  near(transformPoint(list[0],{x:2,y:0,z:0}),{x:2,y:0,z:0});
  near(transformPoint(list[3],{x:2,y:0,z:0}),{x:77,y:0,z:0});
});

test("matrix array produces exact 3D count and independent step directions",()=>{
  const list=matrixArrayTransforms({
    counts:[2,3,2],
    steps:[10,20,30],
    directions:[{x:1,y:0,z:0},{x:0,y:1,z:0},{x:0,y:0,z:1}]
  });
  assert.equal(list.length,12);
  near(transformPoint(list.at(-1),{x:0,y:0,z:0}),{x:10,y:40,z:30});
});

test("circular array rotates around selected center and axis",()=>{
  const list=circularArrayTransforms({
    count:4,
    center:{x:0,y:0,z:0},
    axis:{x:0,y:0,z:1},
    total_angle_deg:360
  });
  near(transformPoint(list[1],{x:10,y:0,z:0}),{x:0,y:10,z:0});
  near(transformPoint(list[2],{x:10,y:0,z:0}),{x:-10,y:0,z:0});
});

test("associative array supports suppress and restore without destroying definition",()=>{
  let array=createAssociativeArray({
    id:"arr-1",
    type:"Linear",
    source_object_ids:["tube-1"],
    parameters:{count:3,step:10,direction:{x:1,y:0,z:0}}
  });
  array=suppressArrayMember(array,1,true);
  let members=arrayMemberTransforms(array);
  assert.equal(members[1].suppressed,true);
  array=suppressArrayMember(array,1,false);
  members=arrayMemberTransforms(array);
  assert.equal(members[1].suppressed,false);
  assert.equal(array.associative,true);
});

test("breaking associative array yields independent visible member transforms",()=>{
  let array=createAssociativeArray({
    id:"arr-1",
    type:"Linear",
    source_object_ids:["tube-1","tube-2"],
    parameters:{count:3,step:10,direction:{x:1,y:0,z:0}}
  });
  array=suppressArrayMember(array,1,true);
  const broken=breakAssociativeArray(array);
  assert.equal(broken.associative,false);
  assert.deepEqual(Array.from(broken.members.map((x)=>x.member_index)),[0,2]);
  assert.deepEqual(Array.from(broken.members[0].source_object_ids),["tube-1","tube-2"]);
});

test("matrix multiplication composes rigid operations without hidden scale",()=>{
  const combined=multiplyMatrices(
    translationMatrix({x:5,y:0,z:0}),
    rotationMatrix({axis:{x:0,y:0,z:1},angle_deg:90})
  );
  near(transformPoint(combined,{x:1,y:0,z:0}),{x:5,y:1,z:0});
});

test("degenerate axes and invalid array counts are rejected",()=>{
  assert.throws(()=>rotationMatrix({axis:{x:0,y:0,z:0},angle_deg:90}),/non-zero/);
  assert.throws(()=>linearArrayTransforms({count:0,step:1,direction:{x:1,y:0,z:0}}),/>= 1/);
  assert.throws(()=>matrixArrayTransforms({counts:[1,0,1],steps:[1,1,1],directions:[{x:1,y:0,z:0},{x:0,y:1,z:0},{x:0,y:0,z:1}]}),/>= 1/);
});
