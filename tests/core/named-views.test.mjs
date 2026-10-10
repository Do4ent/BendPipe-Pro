import test from "node:test";
import assert from "node:assert/strict";
import {
  createNamedView,
  updateNamedView,
  renameNamedView,
  deleteNamedView,
  namedViewById,
  normalizeNamedView
} from "../../src/domain/project/named-views.mjs";

const snapshot={
  name:"Install",
  camera:{
    projection:"orthographic",
    position:{x:10,y:-20,z:30},
    target:{x:1,y:2,z:3},
    up:{x:0,y:0,z:1},
    zoom:2,near:.01,far:9000,left:-5,right:5,top:4,bottom:-4
  },
  active_ucs:{
    bbox_anchor:{x:1,y:0,z:1},
    coordinate_offset:{x:3000,y:0,z:1000},
    axis_signs:{x:1,y:-1,z:1}
  },
  work_plane:{id:"wp1",name:"Fixture",origin:{x:1,y:2,z:3},normal:{x:0,y:1,z:0},x_axis:{x:1,y:0,z:0}},
  environment:{
    view_mode:"user",projection_mode:"orthographic",active_layer_id:"layer-tubes",layer_tree_filter_id:"layer-a",
    layers:[{id:"layer-a",visible:true,frozen:false,locked:true}]
  }
};

test("question 108: Named View stores camera UCS work plane and environment without model geometry",()=>{
  const project={tubes:[{id:"t1",origin:{x:1,y:2,z:3}}]};
  const before=structuredClone(project.tubes);
  const view=createNamedView(project,snapshot);
  assert.equal(view.kind,"NamedView");
  assert.equal(view.camera.projection,"orthographic");
  assert.equal(view.active_ucs.bbox_anchor.x,1);
  assert.equal(view.work_plane.name,"Fixture");
  assert.equal(view.environment.layers[0].locked,true);
  assert.deepEqual(project.tubes,before);
  assert.equal("tubes" in view,false);
});

test("question 108: Named View update keeps identity and refreshes context",()=>{
  const project={};
  const view=createNamedView(project,snapshot);
  const updated=updateNamedView(project,view.id,{
    camera:{...snapshot.camera,projection:"perspective",fov:50},
    active_ucs:snapshot.active_ucs,
    work_plane:snapshot.work_plane,
    environment:{...snapshot.environment,projection_mode:"perspective"}
  });
  assert.equal(updated.id,view.id);
  assert.equal(updated.camera.projection,"perspective");
  assert.equal(updated.camera.fov,50);
});

test("question 108: Named View names are unique and lifecycle is explicit",()=>{
  const project={};
  const a=createNamedView(project,snapshot);
  assert.throws(()=>createNamedView(project,{...snapshot,id:"v2"}),/name already exists/);
  renameNamedView(project,a.id,"QA");
  assert.equal(namedViewById(project,a.id).name,"QA");
  assert.equal(deleteNamedView(project,a.id),true);
  assert.equal(namedViewById(project,a.id),null);
});

test("question 108: camera snapshot normalizes perspective and orthographic fields",()=>{
  const p=normalizeNamedView({...snapshot,name:"P",camera:{...snapshot.camera,projection:"perspective",fov:60}});
  assert.equal(p.camera.projection,"perspective");
  assert.equal(p.camera.fov,60);
  assert.equal("left" in p.camera,false);
  const o=normalizeNamedView({...snapshot,name:"O"});
  assert.equal(o.camera.left,-5);
  assert.equal(o.camera.right,5);
});
