import test from "node:test";
import assert from "node:assert/strict";
import {
  DEFAULT_SNAP_SETTINGS,
  circleSnapCandidates,
  createSnapCandidate,
  cycleSnapCandidate,
  gridSnapCandidate,
  lineIntersectionSnapCandidate,
  lineLineRelation,
  linePlaneIntersection,
  linePlaneSnapCandidate,
  nearestPointCandidate,
  normalizeSnapSettings,
  perpendicularSnapCandidate,
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
