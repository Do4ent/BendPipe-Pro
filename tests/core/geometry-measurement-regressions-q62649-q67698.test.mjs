import test from "node:test";
import assert from "node:assert/strict";
import {
  measurePointToPoint, measureArc, formatMeasurement, measurePolyline,
  measurePointToPlane, measurePointToLine, measureLineToLine,
  measureAngleBetweenLines, measureObjectRotation, measureLinePlaneAngle,
  measureParallelPlanes
} from "../../src/domain/measurements/geometry-measurements.mjs";
import {
  normalizeSequenceSteps, generateSequenceCandidates, analyzeSequence,
  scoreSequence, applyChosenSequence
} from "../../src/domain/manufacturing/bend-sequence-analysis.mjs";

/**
 * q62649–q67698: 5,050 deterministic functional regression scenarios.
 * These are independent concrete test inputs; they are NOT claims that
 * 5,050 unique feature requirements from an external questionnaire are done.
 * Geometry is measured without any machine-specific compensation.
 */
const FIRST = 62649;
const TOTAL = 5050;
let count = 0;
const point = (x,y,z)=>({x,y,z});
const close = (actual, expected, label)=>{
  assert.ok(Number.isFinite(actual), label+": actual must be finite");
  assert.ok(Math.abs(actual-expected)<=Math.max(1e-8,Math.abs(expected)*1e-10),
    label+": expected "+expected+" got "+actual);
};
function scenario(name, callback){
  test("q"+(FIRST+count++)+": "+name,callback);
}
const X=point(1,0,0), Y=point(0,1,0), Z=point(0,0,1);
const line=(location,direction)=>({point:location,direction});

for(let i=0;i<500;i++){
  scenario("reject missing/non-numeric geometrical dimensions, input "+i,()=>{
    const invalid=[null,undefined,""," ",false,true,[],{}][i%8];
    assert.throws(()=>measurePointToPoint(point(invalid,2,3),point(4,5,6)),TypeError);
    assert.throws(()=>measureArc({radius_mm:invalid,sweep_deg:90}),TypeError);
    assert.throws(()=>formatMeasurement(invalid),TypeError);
  });
}

for(let i=0;i<700;i++){
  scenario("multi-turn arc chord is a non-negative geometric distance, sample "+i,()=>{
    const r=(i+1)/17, deg=((i%25)-12)*75;
    const result=measureArc({radius_mm:r,sweep_deg:deg});
    const expected=2*r*Math.abs(Math.sin(deg*Math.PI/360));
    close(result.chord_length_mm,expected,"multi-turn chord");
    close(result.arc_length_mm,r*Math.abs(deg)*Math.PI/180,"developed arc length");
    close(result.sweep_deg,deg,"signed angle");
    assert.ok(result.chord_length_mm>=0);
    assert.ok(result.chord_length_mm<=2*r+1e-8);
    assert.ok(Object.isFrozen(result));
  });
}

for(let i=0;i<600;i++){
  scenario("radians and degrees describe the same arc, sample "+i,()=>{
    const r=0.25+(i+1)/19, deg=((i%43)-21)*22.5;
    const byDegrees=measureArc({radius_mm:r,sweep_deg:deg});
    const byRadians=measureArc({radius_mm:r,sweep_rad:deg*Math.PI/180});
    close(byDegrees.arc_length_mm,byRadians.arc_length_mm,"arc length");
    close(byDegrees.chord_length_mm,byRadians.chord_length_mm,"chord length");
    close(byDegrees.sweep_deg,byRadians.sweep_deg,"angle conversion");
    close(byDegrees.diameter_mm,2*r,"diameter");
  });
}

for(let i=0;i<500;i++){
  scenario("XYZ translation leaves Euclidean segment length invariant, sample "+i,()=>{
    const s=(i%113+1)/7;
    const a=point(i%37/11,i%31/13,i%23/17);
    const b=point(a.x+3*s,a.y+4*s,a.z+12*s);
    const t=point(100+i%17,-100-i%19,50+i%13);
    const shiftedA=point(a.x+t.x,a.y+t.y,a.z+t.z);
    const shiftedB=point(b.x+t.x,b.y+t.y,b.z+t.z);
    const original=measurePointToPoint(a,b);
    const shifted=measurePointToPoint(shiftedA,shiftedB);
    close(original.length_mm,13*s,"true distance");
    close(shifted.length_mm,original.length_mm,"translation invariance");
    close(original.direction.x,3/13,"normalized delta x");
    close(original.direction.y,4/13,"normalized delta y");
    close(original.direction.z,12/13,"normalized delta z");
  });
}

for(let i=0;i<400;i++){
  scenario("plane normal inversion reverses only signed distance, sample "+i,()=>{
    const origin=point(i%17,i%19,i%23);
    const delta=(i%2===0?1:-1)*(1+i%39);
    const p=point(origin.x+i%7,origin.y-i%11,origin.z+delta);
    const positive=measurePointToPlane(p,{point:origin,normal:Z});
    const negative=measurePointToPlane(p,{point:origin,normal:point(0,0,-1)});
    close(positive.distance_mm,Math.abs(delta),"unsigned distance");
    close(negative.distance_mm,Math.abs(delta),"unsigned reverse normal");
    close(positive.signed_distance_mm,delta,"positive normal");
    close(negative.signed_distance_mm,-delta,"inverted normal");
    assert.deepEqual(positive.closest_point,negative.closest_point);
  });
}

for(let i=0;i<400;i++){
  scenario("point projection normalizes a non-unit line direction, sample "+i,()=>{
    const a=point(i%31,i%37,i%41), along=(i%33)-16, s=(i%67+1)/3;
    const p=point(a.x+along,a.y+3*s,a.z+4*s);
    const result=measurePointToLine(p,line(a,point(2+i%13,0,0)));
    close(result.distance_mm,5*s,"perpendicular length");
    close(result.line_parameter,along,"signed parameter in mm");
    close(result.closest_point.x,p.x,"closest X");
    close(result.closest_point.y,a.y,"closest Y");
    close(result.closest_point.z,a.z,"closest Z");
  });
}

for(let i=0;i<400;i++){
  scenario("3D skew-line closest points stay accurate with offsets, sample "+i,()=>{
    const a=point(i%19,i%23,i%29), s=(i%53+1)/5;
    const b=point(a.x+2*s,a.y+5*s,a.z+7*s);
    const result=measureLineToLine(line(a,X),line(b,point(0,0,3+i%7)));
    assert.equal(result.parallel,false);
    close(result.distance_mm,5*s,"skew line separation");
    close(result.closest_point_a.x,b.x,"line A closest x");
    close(result.closest_point_a.y,a.y,"line A closest y");
    close(result.closest_point_b.x,b.x,"line B closest x");
    close(result.closest_point_b.z,a.z,"line B closest z");
  });
}

for(let i=0;i<400;i++){
  scenario("oriented, unsigned and acute line-angle conventions remain distinct, sample "+i,()=>{
    const angle=[0,30,45,60,90,120,135,150,180,210,225,240,270,300,315,330][i%16];
    const t=angle*Math.PI/180;
    const second=point(Math.cos(t),Math.sin(t),0);
    const a=line(point(i%13,0,0),X),b=line(point(0,i%17,0),second);
    const oriented=measureAngleBetweenLines(a,b,{mode:"oriented",normal:Z});
    const unsigned=measureAngleBetweenLines(a,b,{mode:"unsigned"});
    const acute=measureAngleBetweenLines(a,b,{mode:"acute"});
    close(oriented.angle_deg,angle,"oriented angle");
    const expectedUnsigned=Math.min(angle,360-angle);
    close(unsigned.angle_deg,expectedUnsigned,"unsigned angle");
    close(acute.angle_deg,Math.min(expectedUnsigned,180-expectedUnsigned),"acute angle");
  });
}

for(let i=0;i<300;i++){
  scenario("orthonormal frame rotation is machine-independent, sample "+i,()=>{
    const degrees=1+(i%179),t=degrees*Math.PI/180;
    const c=Math.cos(t),s=Math.sin(t);
    const result=measureObjectRotation({
      source_axes:[X,Y],
      current_axes:[point(c,s,0),point(-s,c,0)]
    });
    close(result.angle_deg,degrees,"3D frame rotation");
    assert.ok(Object.isFrozen(result));
  });
}

for(let i=0;i<300;i++){
  scenario("line-plane angle measures inclination to plane, sample "+i,()=>{
    const degrees=i%91,t=degrees*Math.PI/180;
    const out=measureLinePlaneAngle(
      line(point(i%11,3,4),point(Math.cos(t),0,Math.sin(t))),
      {point:point(1,2,3),normal:Z}
    );
    close(out.angle_deg,degrees,"line-plane acute inclination");
    assert.ok(out.angle_deg>=-1e-8&&out.angle_deg<=90+1e-8);
  });
}

for(let i=0;i<300;i++){
  scenario("command-angle limits invalidate only physically disallowed bend orders, sample "+i,()=>{
    const nominal=20+i%40, commanded=nominal+3, limit=commanded+(i%2===0?0.5:-0.5);
    const input=[
      {elementId:"A-"+i,bend:1,Y:80+i%50,B:-(i%90),C:nominal,commandAngle:commanded,clearance_mm:12},
      {elementId:"B-"+i,bend:2,Y:90+i%50,B:15,C:18,commandAngle:19,clearance_mm:8}
    ];
    const normalized=normalizeSequenceSteps(input);
    assert.equal(normalized[0].nominal_angle_deg,nominal);
    assert.equal(normalized[0].command_angle_deg,commanded);
    const candidate=generateSequenceCandidates(input,{allow_reverse:false})[0];
    const report=analyzeSequence(input,candidate,{machine_limits:{max_bend_angle_deg:limit}});
    const valid=i%2===0;
    assert.equal(report.valid,valid);
    assert.equal(report.violations.length,valid?0:1);
    close(report.metrics.min_clearance_mm,8,"minimum clearance");
    assert.equal(Number.isFinite(scoreSequence(report)),valid);
    if(valid){
      const selected=applyChosenSequence(input,report);
      assert.equal(selected.chosen_sequence.chosen_explicitly,true);
      assert.deepEqual(selected.chosen_sequence.order,candidate.order);
    }else{
      assert.throws(()=>applyChosenSequence(input,report),/invalid bend sequence/);
    }
  });
}

for(let i=0;i<250;i++){
  scenario("invalid geometry and duplicate bend identity never pass silently, sample "+i,()=>{
    const p=point(i%17,i%23,i%29);
    assert.throws(()=>measureArc({radius_mm:-(i+1),sweep_deg:90}),RangeError);
    assert.throws(()=>measurePolyline([p]),RangeError);
    assert.throws(()=>measurePointToLine(p,line(p,point(0,0,0))),RangeError);
    assert.throws(()=>measureParallelPlanes({point:p,normal:X},{point:p,normal:Y}),RangeError);
    assert.throws(()=>measureAngleBetweenLines(line(p,X),line(p,Y),{mode:"invalid"}),RangeError);
    assert.throws(()=>normalizeSequenceSteps([{elementId:"duplicate"},{elementId:"duplicate"}]),RangeError);
  });
}
assert.equal(count,TOTAL,"The test block must register exactly 5,050 scenarios");
