import test from "node:test";
import assert from "node:assert/strict";
import {
  createMeshInstance,
  editableMeshInstances,
  findMeshInstance,
  moveMeshInstance,
  rotateMeshInstance,
  copyMeshInstance,
  linearArrayMeshInstances,
  breakMeshInstanceLink
} from "../../src/import/dwfx/editable-mesh-instances.mjs";

function project(){return {};}
const source={scene_id:"scene-1",node_id:"mesh-1",source_file:"sample.dwfx",label:"Bracket"};

test("question 67: Source Mesh creates lightweight editable instance with independent transform",()=>{
  const p=project();
  const instance=createMeshInstance(p,source);
  assert.equal(instance.kind,"EditableMeshInstance");
  assert.deepEqual(instance.source,source);
  assert.deepEqual(instance.transform.position_mm,{x:0,y:0,z:0});
  moveMeshInstance(p,instance.id,{x:10,y:-5,z:2});
  rotateMeshInstance(p,instance.id,{x:0,y:45,z:0});
  const live=findMeshInstance(p,instance.id);
  assert.deepEqual(live.transform.position_mm,{x:10,y:-5,z:2});
  assert.deepEqual(live.transform.rotation_deg,{x:0,y:45,z:0});
});

test("question 67: Copy and Array share Source without duplicating detached payload",()=>{
  const p=project(),instance=createMeshInstance(p,source);
  const copy=copyMeshInstance(p,instance.id,{offset_mm:{x:100,y:0,z:0}});
  const array=linearArrayMeshInstances(p,instance.id,{count:4,step_mm:{x:0,y:50,z:0}});
  assert.equal(copy.source.scene_id,instance.source.scene_id);
  assert.equal(copy.source.node_id,instance.source.node_id);
  assert.equal(copy.detached_payload,null);
  assert.equal(array.length,3);
  assert.ok(array.every((item)=>item.source.scene_id==="scene-1"&&item.source.node_id==="mesh-1"));
  assert.ok(array.every((item)=>item.detached_payload==null));
  assert.equal(editableMeshInstances(p).length,5);
});

test("question 67: Break Link is the point where an independent heavy snapshot is created",()=>{
  const p=project(),instance=createMeshInstance(p,source);
  const snapshot={schema:"detached_mesh_instance_v1",assets:[{id:"asset-1",vertices:[0,0,0]}]};
  breakMeshInstanceLink(p,instance.id,{snapshotSource:()=>snapshot});
  const live=findMeshInstance(p,instance.id);
  assert.equal(live.link_status,"detached");
  assert.deepEqual(live.detached_payload,snapshot);
  snapshot.assets[0].vertices[0]=999;
  assert.equal(live.detached_payload.assets[0].vertices[0],0);
});
