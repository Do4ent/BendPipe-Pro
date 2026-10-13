import test from "node:test";
import assert from "node:assert/strict";
import {
  measurePointToPoint, measureSegment, measurePolyline, measureArc,
  measurePointToPlane, measurePointToLine, measureParallelPlanes,
  projectVectorToPlane
} from "../../src/domain/measurements/geometry-measurements.mjs";
import {
  normalizeSequenceSteps, generateSequenceCandidates,
  analyzeSequence, scoreSequence
} from "../../src/domain/manufacturing/bend-sequence-analysis.mjs";

/**
 * Questions q57599–q62648: 5,050 executable, deterministic functional
 * regression scenarios for already-implemented domain functions.
 *
 * These IDs continue the historical regression-counter scheme, NOT the number
 * of independently implemented requirements in the product questionnaire.
 *
 * Invariants: true 3-D dimensions; machine-neutral measurements; deterministic
 * bend sequence identity, constraints, limits and explicit candidate ordering.
 */
const START = 57599;
const COUNT = 5050;
let registered = 0;
function scenario(description, fn) {
  const number = START + registered++;
  test("q" + number + ": " + description, fn);
}
function close(actual, expected, label) {
  const epsilon = Math.max(1e-9, Math.abs(expected) * 1e-12);
  assert.ok(Math.abs(actual - expected) <= epsilon,
    label + ": expected " + expected + ", got " + actual);
}
const xyz = (x,y,z)=>({x,y,z});

for(let i=1;i<=800;i++) {
  scenario("3D point and segment lengths preserve the 3-4-12 triangle at scale " + i,()=>{
    const p=xyz(i%37-18,i%29-14,-i%23), q=xyz(p.x+3*i,p.y+4*i,p.z+12*i);
    const result=measurePointToPoint(p,q);
    const segment=measureSegment({start:p,end:q});
    close(result.length_mm,13*i,"distance");
    close(segment.length_mm,result.length_mm,"segment length");
    assert.deepEqual(result.delta_mm,xyz(3*i,4*i,12*i));
    close(result.direction.x,3/13,"unit x");
    close(result.direction.y,4/13,"unit y");
    close(result.direction.z,12/13,"unit z");
    assert.ok(Object.isFrozen(result));
  });
}

for(let i=1;i<=600;i++) {
  scenario("polyline length equals sum of two independent legs case " + i,()=>{
    const p=xyz(i%23,-i%31,i%17);
    const q=xyz(p.x+3*i,p.y+4*i,p.z);
    const r=xyz(q.x,q.y,q.z+12*i);
    const result=measurePolyline([p,q,r]);
    close(result.length_mm,17*i,"polyline length");
    close(result.segment_lengths_mm[0],5*i,"first leg");
    close(result.segment_lengths_mm[1],12*i,"second leg");
    assert.equal(result.segment_lengths_mm.length,2);
    assert.ok(Object.isFrozen(result.segment_lengths_mm));
  });
}

for(let i=1;i<=650;i++) {
  scenario("quarter-circle arc preserves length chord sign and diameter case " + i,()=>{
    const radius=i/4+0.25, degrees=i%2===0?90:-90;
    const result=measureArc({radius_mm:radius,sweep_deg:degrees});
    close(result.arc_length_mm,radius*Math.PI/2,"arc length");
    close(result.chord_length_mm,radius*Math.SQRT2,"chord");
    close(result.diameter_mm,2*radius,"diameter");
    close(result.sweep_deg,degrees,"signed sweep");
    assert.ok(result.arc_length_mm>=result.chord_length_mm);
    assert.ok(Object.isFrozen(result));
  });
}

for(let i=1;i<=500;i++) {
  scenario("point-plane signed distance and projection are preserved case " + i,()=>{
    const z=i%41-20, delta=(i%2===0?1:-1)*(i%70+1);
    const normal=xyz(0,0,i%3===0?-1:1), p=xyz(i%31,i%37,z+delta);
    const result=measurePointToPlane(p,{point:xyz(100,-100,z),normal});
    close(result.distance_mm,Math.abs(delta),"absolute distance");
    close(result.signed_distance_mm,delta*normal.z,"signed distance");
    assert.deepEqual(result.closest_point,xyz(p.x,p.y,z));
    assert.ok(Object.isFrozen(result.closest_point));
  });
}

for(let i=1;i<=400;i++) {
  scenario("point-line closest point and perpendicular distance case " + i,()=>{
    const anchor=xyz(i%19,i%23,i%29), along=i%43-21, offset=i%47+1;
    const point=xyz(anchor.x+along,anchor.y+3*offset,anchor.z+4*offset);
    const result=measurePointToLine(point,{point:anchor,direction:xyz(1,0,0)});
    close(result.distance_mm,5*offset,"perpendicular distance");
    close(result.line_parameter,along,"line parameter");
    assert.deepEqual(result.closest_point,xyz(point.x,anchor.y,anchor.z));
  });
}

for(let i=1;i<=350;i++) {
  scenario("parallel-plane separation ignores in-plane offsets case " + i,()=>{
    const z=i%31-15, dz=(i%2===0?1:-1)*(i%97+1);
    const first={point:xyz(i,-i,z),normal:xyz(0,0,1)};
    const second={point:xyz(-2*i,3*i,z+dz),normal:xyz(0,0,i%3===0?-1:1)};
    const result=measureParallelPlanes(first,second);
    close(result.distance_mm,Math.abs(dz),"plane distance");
    close(result.signed_distance_mm,dz,"signed plane distance");
    assert.ok(Object.isFrozen(result));
  });
}

for(let i=1;i<=400;i++) {
  scenario("planar vector projection preserves tangent components case " + i,()=>{
    const m=i/4, input=xyz(3*m,4*m,5*m);
    const result=projectVectorToPlane(input,xyz(0,0,i%2===0?-1:1));
    assert.deepEqual(result.vector,xyz(3*m,4*m,0));
    close(result.length_mm,5*m,"projected length");
    assert.ok(Object.isFrozen(result.vector));
  });
}

for(let i=1;i<=250;i++) {
  scenario("bend normalization preserves explicitly supplied machine data case " + i,()=>{
    const steps=[
      {elementId:"item-"+i+"-1",bend:1,Y:50+i,B:-i%97,C:20+i%90,commandAngle:23+i%90},
      {elementId:"item-"+i+"-2",bend:2,L:100+i,R:i%135,A:90}
    ];
    const result=normalizeSequenceSteps(steps);
    assert.deepEqual(result.map(s=>s.id),steps.map(s=>s.elementId));
    assert.equal(result[0].feed_mm,50+i);
    assert.equal(result[0].command_angle_deg,23+i%90);
    assert.equal(result[0].nominal_angle_deg,20+i%90);
    assert.equal(result[1].feed_mm,100+i);
    assert.equal(result[1].command_angle_deg,null);
    assert.equal(result[1].rotation_deg,i%135);
    assert.ok(Object.isFrozen(result)&&Object.isFrozen(result[0]));
  });
}

for(let i=1;i<=500;i++) {
  scenario("sequence analysis honors command-angle machine limits case " + i,()=>{
    const feedA=100+i%50,feedB=200+i%40, rotation=i%90+1;
    const command=70+i%40,limit=command+(i%2===0?0.5:-0.5);
    const steps=[
      {elementId:"A-"+i,bend:1,Y:feedA,B:-rotation,C:30,commandAngle:command,clearance_mm:18},
      {elementId:"B-"+i,bend:2,Y:feedB,B:14,C:35,commandAngle:35,clearance_mm:8}
    ];
    const candidate=generateSequenceCandidates(steps,{allow_reverse:false})[0];
    const result=analyzeSequence(steps,candidate,{machine_limits:{max_bend_angle_deg:limit}});
    assert.equal(result.valid,i%2===0);
    assert.equal(result.status,i%2===0?"Valid":"Invalid");
    close(result.metrics.total_feed_mm,feedA+feedB,"total feed");
    close(result.metrics.total_rotation_deg,rotation+14,"total absolute rotation");
    assert.equal(result.metrics.min_clearance_mm,8);
    assert.equal(result.metrics.collisions,0);
    assert.equal(result.violations.length,i%2===0?0:1);
    assert.equal(Number.isFinite(scoreSequence(result)),i%2===0);
  });
}

for(let i=1;i<=400;i++) {
  scenario("precedence filters reverse order without changing explicit candidate case " + i,()=>{
    const a="bend-"+i+"-a",b="bend-"+i+"-b",c="bend-"+i+"-c";
    const steps=[a,b,c].map((id,j)=>({elementId:id,bend:j+1,Y:20+j*10,B:0,C:45}));
    const result=generateSequenceCandidates(steps,{
      allow_reverse:true,
      precedence_edges:[{before:a,after:c}],
      explicit_orders:[[a,c,b],[a,c,b],[c,a,b]]
    });
    assert.equal(result.length,2);
    assert.deepEqual(result[0].order,[a,b,c]);
    assert.deepEqual(result[1].order,[a,c,b]);
    assert.equal(result[0].source,"default");
    assert.equal(result[1].source,"explicit");
    assert.ok(Object.isFrozen(result)&&Object.isFrozen(result[0].order));
  });
}

for(let i=1;i<=200;i++) {
  scenario("invalid geometry and duplicate sequence IDs fail explicitly case " + i,()=>{
    const p=xyz(i,i,i);
    assert.throws(()=>measureArc({radius_mm:-i,sweep_deg:90}),RangeError);
    assert.throws(()=>measurePolyline([p]),RangeError);
    assert.throws(()=>measurePointToLine(p,{point:p,direction:xyz(0,0,0)}),RangeError);
    assert.throws(()=>normalizeSequenceSteps([{elementId:"duplicate"},{elementId:"duplicate"}]),RangeError);
  });
}

assert.equal(registered,COUNT,"The regression block must contain exactly 5,050 cases");
