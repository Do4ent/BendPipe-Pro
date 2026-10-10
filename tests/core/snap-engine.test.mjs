import test from "node:test";
import assert from "node:assert/strict";
import {
  DEFAULT_SNAP_SETTINGS,
  circleSnapCandidates,
  createSnapCandidate,
  cycleSnapCandidate,
  gridSnapCandidate,
  lineIntersectionSnapCandidate,
  lineLineIntersectionCandidates,
  projectedLineIntersection,
  lineLineRelation,
  linePlaneIntersection,
  linePlaneSnapCandidate,
  nearestPointCandidate,
  normalizeSnapSettings,
  perpendicularSnapCandidate,
  perpendicularCircleSnapCandidates,
  tangentPointsFromPointToCircle,
  tangentSnapCandidates,
  rankSnapCandidates,
  segmentSnapCandidates,
  selectBestSnapCandidate
} from "../../src/domain/snapping/snap-engine.mjs";

test("default snap settings match agreed always-on and contextual snap types",()=>{
  const s=normalizeSnapSettings();
  assert.equal(s.enabled.Node,true);
  assert.equal(s.enabled.Vertex,true);
  assert.equal(s.enabled.Endpoint,true);
  assert.equal(s.enabled.Intersection,true);
  assert.equal(s.enabled.Center,true);
  assert.equal(s.enabled.Midpoint,true);
  assert.equal(s.enabled.LineAxis,true);
  assert.equal(s.enabled.Plane,true);
  assert.equal(s.enabled.Tangent,false);
  assert.equal(s.enabled.Perpendicular,false);
  assert.equal(s.enabled.Nearest,false);
  assert.equal(s.enabled.Grid,false);
});

test("source priority is applied before snap type priority",()=>{
  const candidates=[
    createSnapCandidate({id:"source-end",type:"Endpoint",source:"SourceReference",point:{x:0,y:0,z:0},screen_distance_px:1}),
    createSnapCandidate({id:"editable-mid",type:"Midpoint",source:"Editable",point:{x:0,y:0,z:0},screen_distance_px:5})
  ];
  assert.equal(selectBestSnapCandidate(candidates)?.id,"editable-mid");
});

test("within one source snap type priority beats screen distance",()=>{
  const candidates=[
    createSnapCandidate({id:"mid",type:"Midpoint",source:"Editable",point:{x:0,y:0,z:0},screen_distance_px:1}),
    createSnapCandidate({id:"end",type:"Endpoint",source:"Editable",point:{x:0,y:0,z:0},screen_distance_px:10})
  ];
  assert.equal(selectBestSnapCandidate(candidates)?.id,"end");
});

test("screen distance breaks priority ties",()=>{
  const candidates=[
    createSnapCandidate({id:"a",type:"Endpoint",source:"Editable",point:{x:0,y:0,z:0},screen_distance_px:8}),
    createSnapCandidate({id:"b",type:"Endpoint",source:"Editable",point:{x:1,y:0,z:0},screen_distance_px:3})
  ];
  assert.equal(selectBestSnapCandidate(candidates)?.id,"b");
});

test("Tab cycling walks all ranked candidates and wraps",()=>{
  const candidates=[
    createSnapCandidate({id:"a",type:"Endpoint",point:{x:0,y:0,z:0},screen_distance_px:1}),
    createSnapCandidate({id:"b",type:"Endpoint",point:{x:1,y:0,z:0},screen_distance_px:2}),
    createSnapCandidate({id:"c",type:"Endpoint",point:{x:2,y:0,z:0},screen_distance_px:3})
  ];
  assert.equal(cycleSnapCandidate(candidates,"a",1)?.id,"b");
  assert.equal(cycleSnapCandidate(candidates,"c",1)?.id,"a");
  assert.equal(cycleSnapCandidate(candidates,"a",-1)?.id,"c");
});

test("cursor capture radius filters distant candidates",()=>{
  const candidates=[
    createSnapCandidate({id:"near",type:"Endpoint",point:{x:0,y:0,z:0},screen_distance_px:5}),
    createSnapCandidate({id:"far",type:"Endpoint",point:{x:1,y:0,z:0},screen_distance_px:50})
  ];
  assert.deepEqual(Array.from(rankSnapCandidates(candidates,{cursor_radius_px:12}).map((x)=>x.id)),["near"]);
});

test("Through Snap excludes hidden candidates by default and admits them explicitly",()=>{
  const hidden=createSnapCandidate({
    id:"hidden",type:"Endpoint",point:{x:0,y:0,z:0},visible:false,through:true
  });
  assert.equal(selectBestSnapCandidate([hidden]),null);
  assert.equal(selectBestSnapCandidate([hidden],{through_snap:true})?.id,"hidden");
  assert.equal(selectBestSnapCandidate([hidden],{}, {through_snap:true})?.id,"hidden");
});

test("contextual Perpendicular and Ctrl-style Nearest can be enabled temporarily",()=>{
  const perpendicular=createSnapCandidate({id:"perp",type:"Perpendicular",point:{x:0,y:0,z:0},virtual:true});
  const nearest=nearestPointCandidate({point:{x:0,y:0,z:0},screen_distance_px:1});
  assert.equal(selectBestSnapCandidate([perpendicular]),null);
  assert.equal(selectBestSnapCandidate([perpendicular],{}, {contextual_types:["Perpendicular"]})?.id,"perp");
  assert.equal(selectBestSnapCandidate([nearest]),null);
  assert.equal(selectBestSnapCandidate([nearest],{}, {nearest_override:true})?.type,"Nearest");
});

test("segment snaps produce endpoint midpoint and line-axis candidates",()=>{
  const c=segmentSnapCandidates({
    start:{x:0,y:0,z:0},
    end:{x:10,y:0,z:0},
    object_id:"line-1"
  });
  assert.deepEqual(Array.from(c.map((x)=>x.type)),["Endpoint","Endpoint","Midpoint","LineAxis"]);
  assert.deepEqual(c[2].point,{x:5,y:0,z:0});
  assert.deepEqual(c[3].metadata.direction,{x:1,y:0,z:0});
});

test("circle snap exposes exact center metadata",()=>{
  const c=circleSnapCandidates({center:{x:1,y:2,z:3},radius_mm:25,object_id:"circle"})[0];
  assert.equal(c.type,"Center");
  assert.deepEqual(c.point,{x:1,y:2,z:3});
  assert.equal(c.metadata.radius_mm,25);
});

test("perpendicular snap is virtual and returns shortest projection",()=>{
  const c=perpendicularSnapCandidate({
    point:{x:4,y:3,z:0},
    line_point:{x:0,y:0,z:0},
    line_direction:{x:1,y:0,z:0},
    object_id:"line"
  });
  assert.equal(c.type,"Perpendicular");
  assert.equal(c.virtual,true);
  assert.deepEqual(c.point,{x:4,y:0,z:0});
  assert.equal(c.metadata.distance_mm,3);
});

test("3D line relation distinguishes real intersection from closest points",()=>{
  const real=lineLineRelation(
    {point:{x:0,y:0,z:0},direction:{x:1,y:0,z:0}},
    {point:{x:2,y:-1,z:0},direction:{x:0,y:1,z:0}}
  );
  assert.equal(real.kind,"RealIntersection");
  assert.deepEqual(real.point,{x:2,y:0,z:0});

  const skew=lineLineRelation(
    {point:{x:0,y:0,z:0},direction:{x:1,y:0,z:0}},
    {point:{x:0,y:5,z:2},direction:{x:0,y:0,z:1}}
  );
  assert.equal(skew.kind,"ClosestPoints");
  assert.equal(skew.gap_mm,5);
});

test("intersection snap refuses skew lines unless virtual closest mode is explicitly allowed",()=>{
  const args={
    lineA:{point:{x:0,y:0,z:0},direction:{x:1,y:0,z:0}},
    lineB:{point:{x:0,y:5,z:2},direction:{x:0,y:0,z:1}}
  };
  assert.equal(lineIntersectionSnapCandidate(args),null);
  const c=lineIntersectionSnapCandidate({...args,allow_closest:true});
  assert.equal(c.type,"Intersection");
  assert.equal(c.virtual,true);
  assert.equal(c.metadata.kind,"ClosestPoints");
});

test("line-plane virtual intersection computes exact extension parameter",()=>{
  const hit=linePlaneIntersection({
    line:{point:{x:0,y:0,z:0},direction:{x:1,y:0,z:0}},
    plane:{point:{x:10,y:0,z:0},normal:{x:1,y:0,z:0}}
  });
  assert.equal(hit.status,"Intersection");
  assert.equal(hit.parameter,10);
  assert.deepEqual(hit.point,{x:10,y:0,z:0});

  const snap=linePlaneSnapCandidate({
    line:{point:{x:0,y:0,z:0},direction:{x:1,y:0,z:0}},
    plane:{point:{x:10,y:0,z:0},normal:{x:1,y:0,z:0}}
  });
  assert.equal(snap.virtual,true);
  assert.equal(snap.type,"Intersection");
});

test("Grid remains lowest-priority and disabled by default",()=>{
  const grid=gridSnapCandidate({point:{x:0,y:0,z:0},screen_distance_px:1});
  const endpoint=createSnapCandidate({id:"end",type:"Endpoint",source:"Editable",point:{x:1,y:0,z:0},screen_distance_px:10});
  assert.equal(selectBestSnapCandidate([grid,endpoint])?.id,"end");
  const enabled=selectBestSnapCandidate([grid],{enabled:{Grid:true}});
  assert.equal(enabled.type,"Grid");
});

test("default constants are immutable",()=>{
  assert.equal(Object.isFrozen(DEFAULT_SNAP_SETTINGS),true);
  assert.equal(Object.isFrozen(DEFAULT_SNAP_SETTINGS.enabled),true);
});


test("Object Snap Tracking creates virtual rays and real tracking intersections",async()=>{
  const mod=await import("../../src/domain/snapping/snap-engine.mjs");
  const a=mod.createObjectSnapTrackingRay({anchor:{x:0,y:0,z:0},direction:{x:1,y:0,z:0},source_candidate_id:"A"});
  const b=mod.createObjectSnapTrackingRay({anchor:{x:10,y:-5,z:0},direction:{x:0,y:1,z:0},source_candidate_id:"B"});
  const hit=mod.intersectObjectSnapTrackingRays(a,b,{tolerance_mm:0.001});
  assert.equal(hit.type,"Intersection");
  assert.equal(hit.virtual,true);
  assert.equal(hit.metadata.tracking,true);
  assert.ok(Math.abs(hit.point.x-10)<1e-9);
  assert.ok(Math.abs(hit.point.y)<1e-9);
  const projected=mod.objectSnapTrackingCandidate({cursor:{x:5,y:3,z:0},ray:a});
  assert.equal(projected.metadata.tracking,true);
  assert.ok(Math.abs(projected.point.y)<1e-9);
});


test("question 83: Tangent snap returns both mathematical solutions and degenerates to one or zero",()=>{
  const two=tangentPointsFromPointToCircle({
    point:{x:10,y:0,z:0},center:{x:0,y:0,z:0},radius_mm:5
  });
  assert.equal(two.length,2);
  for(const p of two){
    const radius={x:p.x,y:p.y,z:p.z};
    const chord={x:10-p.x,y:-p.y,z:-p.z};
    assert.ok(Math.abs(radius.x*chord.x+radius.y*chord.y+radius.z*chord.z)<1e-9);
  }
  const one=tangentPointsFromPointToCircle({
    point:{x:5,y:0,z:0},center:{x:0,y:0,z:0},radius_mm:5
  });
  assert.equal(one.length,1);
  const none=tangentPointsFromPointToCircle({
    point:{x:2,y:0,z:0},center:{x:0,y:0,z:0},radius_mm:5
  });
  assert.equal(none.length,0);
});

test("question 83: finite-segment Perpendicular is real on segment and Virtual on extension",()=>{
  const real=perpendicularSnapCandidate({
    point:{x:5,y:3,z:0},line_point:{x:0,y:0,z:0},line_direction:{x:1,y:0,z:0},
    parameter_min:0,parameter_max:10,object_id:"seg"
  });
  assert.equal(real.virtual,false);
  assert.equal(real.metadata.on_entity,true);
  const virtual=perpendicularSnapCandidate({
    point:{x:15,y:3,z:0},line_point:{x:0,y:0,z:0},line_direction:{x:1,y:0,z:0},
    parameter_min:0,parameter_max:10,object_id:"seg"
  });
  assert.equal(virtual.virtual,true);
  assert.equal(virtual.metadata.extension,true);
});

test("question 83: circle Perpendicular exposes both radial solutions",()=>{
  const hits=perpendicularCircleSnapCandidates({
    point:{x:10,y:0,z:0},center:{x:0,y:0,z:0},radius_mm:5,object_id:"circle"
  });
  assert.equal(hits.length,2);
  assert.deepEqual(hits.map(x=>x.type),["Perpendicular","Perpendicular"]);
  assert.ok(hits.every(x=>x.metadata.constraint_type==="Perpendicular"));
});

test("question 83: tangent points outside finite arc remain available as Virtual Snap",()=>{
  const hits=tangentSnapCandidates({
    point:{x:10,y:0,z:0},center:{x:0,y:0,z:0},radius_mm:5,object_id:"arc",
    arc_start_deg:0,arc_end_deg:30,arc_basis_x:{x:1,y:0,z:0}
  });
  assert.equal(hits.length,2);
  assert.ok(hits.some(x=>x.virtual===true));
  assert.ok(hits.every(x=>x.type==="Tangent"));
  assert.ok(hits.every(x=>x.metadata.constraint_type==="Tangent"));
});

test("question 83: Tab cycling includes multiple contextual Tangent candidates",()=>{
  const hits=tangentSnapCandidates({
    point:{x:10,y:0,z:0},center:{x:0,y:0,z:0},radius_mm:5,object_id:"circle"
  }).map((x,i)=>({...x,screen_distance_px:i+1}));
  const options={contextual_types:["Tangent"]};
  const first=selectBestSnapCandidate(hits,{},options);
  const second=cycleSnapCandidate(hits,first.id,1,{},options);
  assert.notEqual(second.id,first.id);
  assert.equal(cycleSnapCandidate(hits,second.id,1,{},options).id,first.id);
});


test("question 84: real 3D intersection is labeled Real Intersection",()=>{
  const hits=lineLineIntersectionCandidates({
    lineA:{point:{x:0,y:0,z:0},direction:{x:1,y:0,z:0}},
    lineB:{point:{x:2,y:-1,z:0},direction:{x:0,y:1,z:0}},
    working_plane:{point:{x:0,y:0,z:0},normal:{x:0,y:0,z:1}}
  });
  assert.equal(hits.length,1);
  assert.equal(hits[0].label,"Real Intersection");
  assert.equal(hits[0].metadata.kind,"RealIntersection");
  assert.equal(hits[0].virtual,false);
});

test("question 84: skew lines expose Projected Intersection and both Closest Points",()=>{
  const args={
    lineA:{point:{x:0,y:0,z:0},direction:{x:1,y:0,z:0}},
    lineB:{point:{x:2,y:-1,z:2},direction:{x:0,y:1,z:0}},
    working_plane:{point:{x:0,y:0,z:0},normal:{x:0,y:0,z:1}}
  };
  const hits=lineLineIntersectionCandidates(args);
  assert.deepEqual(hits.map(x=>x.label),["Projected Intersection","Closest Point A","Closest Point B"]);
  assert.equal(hits[0].metadata.kind,"ProjectedIntersection");
  assert.deepEqual(hits[0].point,{x:2,y:0,z:0});
  assert.ok(hits.slice(1).every(x=>x.metadata.kind==="ClosestPoints"));
  assert.ok(hits.every(x=>x.virtual===true));
  assert.equal(hits[1].metadata.gap_mm,2);
});

test("question 84: projected intersection explicitly uses working plane projection",()=>{
  const hit=projectedLineIntersection({
    lineA:{point:{x:0,y:0,z:4},direction:{x:1,y:0,z:0}},
    lineB:{point:{x:3,y:-2,z:-5},direction:{x:0,y:1,z:0}},
    plane:{point:{x:0,y:0,z:0},normal:{x:0,y:0,z:1}}
  });
  assert.equal(hit.status,"ProjectedIntersection");
  assert.deepEqual(hit.point,{x:3,y:0,z:0});
  assert.deepEqual(Array.from(hit.source_plane_distances_mm),[4,-5]);
});

test("question 84: without working plane skew lines return Closest Points only",()=>{
  const hits=lineLineIntersectionCandidates({
    lineA:{point:{x:0,y:0,z:0},direction:{x:1,y:0,z:0}},
    lineB:{point:{x:0,y:5,z:2},direction:{x:0,y:0,z:1}}
  });
  assert.deepEqual(hits.map(x=>x.metadata.kind),["ClosestPoints","ClosestPoints"]);
});
