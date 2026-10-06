import test from "node:test";
import assert from "node:assert/strict";
import {
  intersectTriangleWithPlane,
  clipSegmentToBox,
  sectionSegmentsFromTriangles
} from "../../src/domain/geometry/section-derived.mjs";

test("question 110: triangle-plane intersection yields a virtual contour segment",()=>{
  const tri=[{x:-1,y:0,z:0},{x:1,y:0,z:0},{x:0,y:1,z:0}];
  const hit=intersectTriangleWithPlane(tri,{point:{x:0,y:0,z:0},normal:{x:1,y:0,z:0}});
  assert.equal(hit.status,"segment");
  assert.equal(hit.segment.length,2);
  for(const p of hit.segment)assert.ok(Math.abs(p.x)<1e-9);
});

test("question 110: section box clips derived segments to box bounds",()=>{
  const clipped=clipSegmentToBox(
    [{x:-5,y:0,z:0},{x:5,y:0,z:0}],
    {min:{x:-1,y:-1,z:-1},max:{x:1,y:1,z:1}}
  );
  assert.deepEqual(clipped,[{x:-1,y:0,z:0},{x:1,y:0,z:0}]);
});

test("question 110: Section Box derives contour segments from each active box face",()=>{
  const triangles=[
    [{x:-2,y:-2,z:0},{x:2,y:-2,z:0},{x:0,y:2,z:0}]
  ];
  const section={
    mode:"box",enabled:true,
    box:{min:{x:-1,y:-1,z:-1},max:{x:1,y:1,z:1}}
  };
  const segments=sectionSegmentsFromTriangles(triangles,section);
  assert.ok(segments.length>0);
  assert.ok(segments.every(item=>["xmin","xmax","ymin","ymax","zmin","zmax"].includes(item.face)));
});

test("question 110: disabled Section View generates no derived geometry",()=>{
  const triangles=[[{x:-1,y:0,z:0},{x:1,y:0,z:0},{x:0,y:1,z:0}]];
  assert.deepEqual(sectionSegmentsFromTriangles(triangles,{mode:"off",enabled:false}),[]);
});
