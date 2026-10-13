import test from "node:test";
import assert from "node:assert/strict";
import {
  moveByPoints, transformPoint, transformVector, translationMatrix,
  rotationMatrix, mirrorMatrix, multiplyMatrices, composeTransformStack,
  createTransformOperation, rigidMatrixCheck, assertRigidTransformMatrix,
  linearArrayTransforms, matrixArrayTransforms, circularArrayTransforms,
  scalePermission
} from "../../src/domain/editing/transform-commands.mjs";
import {
  createStraightRun, splitStraightAtDistance, straightRunSegments,
  straightRunSnapNodes, splitStraightAtNormalized, serializeStraightRunToLegacy,
  straightRunFromLegacy
} from "../../src/domain/editing/straight-run.mjs";
import {
  normalizeGeometryToleranceProfile, mathematicalToleranceProfile,
  snapSettingsFromToleranceProfile, recognitionSettingsFromToleranceProfile,
  createGeometryFitEvidence
} from "../../src/domain/geometry/tolerance-profile.mjs";
import { simplifyPolylineEvidence } from "../../src/recognition/polyline-centerline.mjs";
import { summarizeCollisionValidation } from "../../src/domain/validation/collisions.mjs";

/**
 * q67699–q72748: 5,050 concrete deterministic regression scenarios.
 * Numbers are the historical test-scenario counter, NOT proof of completing
 * 5,050 distinct items in the product questionnaire.
 */
const START=67699, TOTAL=5050;
let n=0;
function scenario(name,body){
  test("q"+(START+n++)+": "+name,body);
}
const p=(x,y,z)=>({x,y,z});
const X=p(1,0,0),Y=p(0,1,0),Z=p(0,0,1);
function near(actual,expected,label,epsilon=1e-8){
  assert.ok(Number.isFinite(actual),label+": non-finite result "+actual);
  assert.ok(Math.abs(actual-expected)<=epsilon*Math.max(1,Math.abs(expected)),
    label+": "+actual+" != "+expected);
}
function nearPoint(actual,expected,label){
  for(const key of ["x","y","z"])near(actual[key],expected[key],label+"."+key);
}

// 600: explicit 3D moves, preserving vectors and rigid model policy.
for(let i=0;i<600;i++){
  scenario("Move by two 3D points #"+i,()=>{
    const base=p(i%37/7, -i%43/9, i%47/11);
    const delta=p((i%31-15)/2,(i%29-14)/3,(i%23-11)/4);
    const target=p(base.x+delta.x,base.y+delta.y,base.z+delta.z);
    const op=moveByPoints(base,target);
    nearPoint(op.delta,delta,"delta");
    const q=p(i%17,i%19,-i%13);
    nearPoint(transformPoint(op.matrix,q),p(q.x+delta.x,q.y+delta.y,q.z+delta.z),"moved point");
    nearPoint(transformVector(op.matrix,q),q,"translation-free vector");
    assert.equal(rigidMatrixCheck(op.matrix).rigid,true);
    assert.ok(Object.isFrozen(op.matrix));
  });
}

// 550: rotations about arbitrary offsets, unchanged center and distances.
for(let i=0;i<550;i++){
  scenario("Rotate around shifted Z axis #"+i,()=>{
    const center=p(i%17,-i%23,i%29);
    const degrees=(i%360)-179, theta=degrees*Math.PI/180;
    const radius=1+(i%41)/3;
    const matrix=rotationMatrix({axis:p(0,0,2+i%7),center,angle_deg:degrees});
    nearPoint(transformPoint(matrix,center),center,"fixed center");
    const start=p(center.x+radius,center.y,center.z);
    const actual=transformPoint(matrix,start);
    nearPoint(actual,p(center.x+radius*Math.cos(theta),center.y+radius*Math.sin(theta),center.z),"rotated point");
    nearPoint(transformVector(matrix,Z),Z,"axis direction");
    assert.equal(rigidMatrixCheck(matrix).rigid,true);
  });
}

// 500: reflection across a shifted plane must be an involution.
for(let i=0;i<500;i++){
  scenario("Mirror across offset XY plane twice #"+i,()=>{
    const z0=(i%59-29)/8, point=p(i%37/4,-i%31/3,(i%43-21)/6);
    const matrix=mirrorMatrix({plane_point:p(i,-i,z0),plane_normal:p(0,0,7+i%13)});
    const reflected=transformPoint(matrix,point);
    nearPoint(reflected,p(point.x,point.y,2*z0-point.z),"reflected point");
    nearPoint(transformPoint(matrix,reflected),point,"double reflection");
    const check=rigidMatrixCheck(matrix);
    assert.equal(check.rigid,true);
    assert.equal(check.reflection,true);
    assert.ok(check.determinant<0);
  });
}

// 500: composition uses documented operation order; disabled transforms do nothing.
for(let i=0;i<500;i++){
  scenario("Stack composition and disabled operation #"+i,()=>{
    const delta=p(i%13,-i%17,i%19);
    const shift=translationMatrix(delta);
    const rotate=rotationMatrix({axis:Z,angle_deg:90});
    const move=createTransformOperation({id:"m"+i,kind:"Move",matrix:shift});
    const turn=createTransformOperation({id:"r"+i,kind:"Rotate",matrix:rotate,enabled:false});
    const q=p((i%17)+1,3,-2);
    const off=composeTransformStack([move,turn]);
    nearPoint(transformPoint(off,q),p(q.x+delta.x,q.y+delta.y,q.z+delta.z),"disabled rotation");
    const both=composeTransformStack([move,{...turn,enabled:true}]);
    const expected=p(-(q.y+delta.y),q.x+delta.x,q.z+delta.z);
    nearPoint(transformPoint(both,q),expected,"move then rotate");
    const manual=multiplyMatrices(rotate,shift);
    nearPoint(transformPoint(manual,q),expected,"matrix multiply");
  });
}

// 400: scale/shear must be rejected for tube geometry; rigid Move stays legal.
for(let i=0;i<400;i++){
  scenario("Reject hidden scale and shear in tube transforms #"+i,()=>{
    const factor=1.1+(i%67)/100, shear=(i%29+1)/100;
    const matrix=i%2===0
      ?[factor,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1]
      :[1,shear,0,0,0,1,0,0,0,0,1,0,0,0,0,1];
    const check=rigidMatrixCheck(matrix);
    assert.equal(check.rigid,false);
    assert.equal(check.hidden_scale_or_shear,true);
    assert.throws(()=>assertRigidTransformMatrix(matrix),e=>e.code==="NON_RIGID_TUBE_TRANSFORM");
    assert.equal(scalePermission({kind:"tube"}).allowed,false);
    assert.equal(scalePermission({kind:"mesh-instance"}).allowed,true);
  });
}

// 500: array member zero is unchanged; each step is an exact 3D translation.
for(let i=0;i<500;i++){
  scenario("Linear array has correct original and last member #"+i,()=>{
    const count=2+i%9, step=(i%2===0?1:-1)*(1+i%97)/3;
    const matrices=linearArrayTransforms({count,step,direction:p(0,0,-5)});
    assert.equal(matrices.length,count);
    const q=p(i%13,i%17,i%19);
    nearPoint(transformPoint(matrices[0],q),q,"original member");
    nearPoint(transformPoint(matrices.at(-1),q),p(q.x,q.y,q.z-(count-1)*step),"last member");
    assert.ok(matrices.every(m=>rigidMatrixCheck(m).rigid));
    assert.ok(Object.isFrozen(matrices));
  });
}

// 350: orthogonal matrix arrays span all X/Y/Z directions.
for(let i=0;i<350;i++){
  scenario("Matrix array counts and offsets #"+i,()=>{
    const counts=[2+i%3,2+i%4,2+i%2],steps=[1+i%11,2+i%13,-(3+i%17)];
    const mats=matrixArrayTransforms({counts,steps,directions:[X,Y,Z]});
    assert.equal(mats.length,counts[0]*counts[1]*counts[2]);
    const p0=p(2,3,4);
    nearPoint(transformPoint(mats[0],p0),p0,"matrix member zero");
    nearPoint(transformPoint(mats.at(-1),p0),p(
      2+(counts[0]-1)*steps[0],
      3+(counts[1]-1)*steps[1],
      4+(counts[2]-1)*steps[2]),"last XYZ member");
  });
}

// 350: circular array around offset center, rotation of original tube is rigid.
for(let i=0;i<350;i++){
  scenario("Circular array retains center and is rigid #"+i,()=>{
    const count=3+i%7, center=p(i%19,i%23,i%29),radius=1+i%41;
    const mats=circularArrayTransforms({count,center,axis:Z,total_angle_deg:360});
    assert.equal(mats.length,count);
    const start=p(center.x+radius,center.y,center.z);
    nearPoint(transformPoint(mats[0],start),start,"circular original");
    nearPoint(transformPoint(mats[0],center),center,"center unchanged");
    const angle=2*Math.PI/count;
    nearPoint(transformPoint(mats[1],start),
      p(center.x+radius*Math.cos(angle),center.y+radius*Math.sin(angle),center.z),
      "first copy");
    assert.ok(mats.every(m=>rigidMatrixCheck(m).rigid));
  });
}

// 450: split segments, snap nodes and lossless legacy roundtrips.
for(let i=0;i<450;i++){
  scenario("Straight-run split and legacy roundtrip #"+i,()=>{
    const length=100+i/2, split=length*(1+(i%7))/10;
    const original=createStraightRun({id:"run-"+i,total_length_mm:length,source_row_id:"row-"+i});
    const updated=splitStraightAtDistance(original,split);
    assert.equal(original.nodes_mm.length,0);
    assert.equal(updated.nodes_mm.length,1);
    near(updated.nodes_mm[0],split,"split location");
    const segments=straightRunSegments(updated);
    assert.equal(segments.length,2);
    near(segments[0].length_mm+segments[1].length_mm,length,"total straight length");
    const snaps=straightRunSnapNodes(updated,{origin:p(1,2,3),direction:p(0,0,8)});
    nearPoint(snaps[0].point,p(1,2,3+split),"snap node coordinate");
    const recovered=straightRunFromLegacy(serializeStraightRunToLegacy(updated));
    assert.deepEqual(recovered,updated);
    const mid=splitStraightAtNormalized(original,0.5);
    near(mid.nodes_mm[0],length/2,"normalized midpoint");
  });
}

// 350: mathematical tolerances and cursor capture remain in different domains.
for(let i=0;i<350;i++){
  scenario("Tolerance profile separates millimeters degrees and pixels #"+i,()=>{
    const linear=0.001+(i%73)/1000, pointTol=linear/2, capture=1+i%52;
    const profile=normalizeGeometryToleranceProfile({
      linear_tolerance_mm:linear,
      point_tolerance_mm:pointTol,
      circle_arc_fit_tolerance_mm:0.05+i%9/100,
      cursor_capture_radius_px:capture
    });
    const math=mathematicalToleranceProfile(profile);
    const snap=snapSettingsFromToleranceProfile(profile,{snap_mode:"all"});
    const recognize=recognitionSettingsFromToleranceProfile(profile,{track_provenance:true});
    near(math.linear_tolerance_mm,linear,"linear tolerance");
    assert.equal("cursor_capture_radius_px" in math,false);
    assert.equal(snap.cursor_radius_px,capture);
    assert.equal(snap.snap_mode,"all");
    assert.equal(recognize.track_provenance,true);
    assert.equal("cursor_radius_px" in recognize,false);
    const fit=createGeometryFitEvidence({
      mode:"Fitted",fitting_error_mm:linear/2,tolerance_mm:linear,
      evidence:[{source:"test",id:i}]
    });
    near(fit.confidence,0.5,"fitted confidence");
    assert.equal(fit.geometry_status,"Fitted");
    assert.ok(Object.isFrozen(fit.evidence));
  });
}

// 250: ordered imported polyline evidence identifies one genuine turn.
for(let i=0;i<250;i++){
  scenario("Polyline simplification keeps one true right-angle turn #"+i,()=>{
    const length=4+i/5, base=[i%17,i%19,i%23];
    const points=[
      [...base],
      [base[0]+length/2,base[1],base[2]],
      [base[0]+length,base[1],base[2]],
      [base[0]+length,base[1]+length,base[2]]
    ];
    const out=simplifyPolylineEvidence(points,{duplicate_tolerance_mm:0.001,collinear_angle_tolerance_deg:0.5});
    assert.equal(out.status,"candidate");
    assert.equal(out.production_ready,false);
    assert.equal(out.source_point_count,4);
    assert.equal(out.simplified_point_count,3);
    assert.equal(out.segments.length,2);
    assert.equal(out.turns.length,1);
    near(out.turns[0].deflection_deg,90,"right angle");
    near(out.segments[0].length_mm,length,"first straight");
    near(out.segments[1].length_mm,length,"second straight");
  });
}

// 250: inactive-tube collisions must never be hidden by active selection.
for(let i=0;i<250;i++){
  scenario("Collision validation distinguishes active and project scope #"+i,()=>{
    const active="active-"+i,other="other-"+i,third="third-"+i;
    const collisions=[
      {tubeAId:active,tubeBId:active,self:true},
      {tubeAId:other,tubeBId:third,self:false}
    ];
    const report=summarizeCollisionValidation({collisions,activeTubeId:active});
    assert.equal(report.active_tube.status,"violation");
    assert.equal(report.active_tube.collision_count,1);
    assert.equal(report.active_tube.self_collision_count,1);
    assert.equal(report.active_tube.intertube_collision_count,0);
    assert.equal(report.project.status,"violation");
    assert.equal(report.project.collision_count,2);
    assert.equal(report.project.inactive_only_collision_count,1);
    const none=summarizeCollisionValidation({collisions,activeTubeId:"missing-"+i});
    assert.equal(none.active_tube.status,"passed");
    assert.equal(none.project.status,"violation");
  });
}
assert.equal(n,TOTAL,"Exactly 5,050 scenarios must be registered");
