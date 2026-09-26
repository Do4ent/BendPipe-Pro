import test from "node:test";
import assert from "node:assert/strict";

import { segmentPolylineCandidates } from "../../src/recognition/polyline-segmentation.mjs";

test("A19: line plus quarter-circle evidence segments into LINE + BEND",()=>{
  const points=[
    [-100,0,0],
    [-50,0,0],
    [0,0,0]
  ];
  for(let i=1;i<=4;i++){
    const a=-Math.PI/2+(Math.PI/2)*(i/4);
    points.push([
      50*Math.cos(a),
      50+50*Math.sin(a),
      0
    ]);
  }

  const r=segmentPolylineCandidates(points,{
    line_tolerance_mm:0.01,
    arc_radial_tolerance_mm:1e-6,
    arc_plane_tolerance_mm:1e-6,
    min_arc_points:5
  });

  assert.equal(r.status,"candidate");
  assert.equal(r.production_ready,false);
  assert.equal(r.primitive_count,2);
  assert.deepEqual(r.primitives.map(x=>x.primitive.type),["LINE","BEND"]);
  assert.equal(r.primitives[0].source_start_index,0);
  assert.equal(r.primitives[0].source_end_index,2);
  assert.equal(r.primitives[1].source_start_index,2);
  assert.equal(r.primitives[1].source_end_index,6);
  assert.ok(Math.abs(r.primitives[1].primitive.clr_mm-50)<1e-9);
});

test("A19: one straight remains one primitive rather than many two-point lines",()=>{
  const r=segmentPolylineCandidates([
    [0,0,0],
    [25,0.01,0],
    [50,0,0],
    [100,0,0]
  ],{
    line_tolerance_mm:0.02
  });
  assert.equal(r.primitive_count,1);
  assert.equal(r.primitives[0].primitive.type,"LINE");
});

test("A19: one circular arc remains one BEND when enough evidence points exist",()=>{
  const pts=[];
  for(let i=0;i<=8;i++){
    const a=Math.PI*(i/8);
    pts.push([30*Math.cos(a),30*Math.sin(a),0]);
  }
  const r=segmentPolylineCandidates(pts,{
    line_tolerance_mm:0.01,
    arc_radial_tolerance_mm:1e-6,
    arc_plane_tolerance_mm:1e-6,
    min_arc_points:5
  });
  assert.equal(r.primitive_count,1);
  assert.equal(r.primitives[0].primitive.type,"BEND");
  assert.ok(Math.abs(r.primitives[0].primitive.clr_mm-30)<1e-9);
});

test("A19: three arbitrary points cannot become a bend when min_arc_points is five",()=>{
  const r=segmentPolylineCandidates([
    [0,0,0],
    [10,10,0],
    [20,0,0]
  ],{
    line_tolerance_mm:0.01,
    min_arc_points:5
  });

  assert.equal(r.status,"candidate");
  assert.equal(r.primitive_count,2);
  assert.deepEqual(r.primitives.map(x=>x.primitive.type),["LINE","LINE"]);
  assert.equal(r.production_ready,false);
});

test("A19: max_primitives can block over-segmented evidence",()=>{
  const r=segmentPolylineCandidates([
    [0,0,0],
    [10,10,0],
    [20,0,0],
    [30,10,0],
    [40,0,0]
  ],{
    line_tolerance_mm:0.01,
    min_arc_points:5,
    max_primitives:1
  });
  assert.equal(r.status,"unresolved");
  assert.equal(r.primitives.length,0);
});
