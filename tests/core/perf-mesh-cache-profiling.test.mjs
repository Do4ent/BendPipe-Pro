import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
test("unchanged DWFx mesh templates are reused on repeat render",()=>{
  const source=fs.readFileSync(new URL("../../src/import/dwfx/reference-scene-ui.js",import.meta.url),"utf8");
  const window={};
  vm.runInNewContext(source,{window,setTimeout,clearTimeout,globalThis:{}});
  class Group{
    constructor(){this.children=[];this.userData={};this.scale={setScalar(){}};this.position={set(){}};}
    add(o){this.children.push(o);}
    updateMatrixWorld(){}
    clone(){return new Group();}
  }
  class BufferGeometry{
    setAttribute(){return this;}
    setIndex(){return this;}
    computeVertexNormals(){}
  }
  class BufferAttribute{constructor(array){this.array=array;}}
  class Mesh{constructor(){this.userData={};this.matrix={fromArray(){}};}clone(){return this;}}
  const THREE={Group,BufferGeometry,BufferAttribute,Mesh,MeshStandardMaterial:class{},DoubleSide:2};
  const mesh={vertices:[[0,0,0],[1,0,0],[0,1,0]],faces:[[0,1,2]]};
  const asset={id:"asset",status:"exact",kind:"mesh",meshes:[mesh]};
  const project={tubes:[],referenceScenes:[{id:"scene",visible:true,tree:[{id:"root",children:[],
    geometry_instances:[{status:"exact",asset_id:"asset"}]}],
    display_runtime:{scene_id:"scene",assets:[asset],scale_mm_per_source_unit:1}}]};
  const ui=window.TubeBenderReferenceSceneUi;
  ui.render3D({parent:new Group(),project,THREE,geomScale:1});
  const first=ui.performanceStats();
  assert.equal(first.templateBuilds,1);
  project.tubes.push({id:"edited-tube",rows:[{length:42}]});
  ui.render3D({parent:new Group(),project,THREE,geomScale:1});
  const second=ui.performanceStats();
  assert.equal(second.templateBuilds,1,"editing tube parameters must not rebuild unchanged mesh buffers");
  assert.ok(second.templateCacheHits>=1);
  assert.equal(second.largeMeshes.length,0);
});
