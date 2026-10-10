import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

test("large DWFx mesh prepares vertex and index buffers across multiple tasks",()=>{
  const source=fs.readFileSync(new URL("../../src/import/dwfx/reference-scene-ui.js",import.meta.url),"utf8");
  const window={};vm.runInNewContext(source,{window,setTimeout,clearTimeout,globalThis:{}});
  class Group{
    constructor(){this.children=[];this.userData={};this.scale={setScalar(){}};this.position={set(){}};}
    add(v){this.children.push(v);}
    clear(){this.children=[];}
    updateMatrixWorld(){}
    clone(){return new Group();}
  }
  class BufferGeometry{
    setAttribute(name,value){this.positions=value;return this;}
    setIndex(value){this.indices=value;return this;}
    computeVertexNormals(){}
  }
  class BufferAttribute{constructor(array,itemSize){this.array=array;this.itemSize=itemSize;}}
  class Mesh{
    constructor(geometry){this.geometry=geometry;this.userData={};this.matrix={fromArray(){}};}
    clone(){return this;}
  }
  const THREE={Group,BufferGeometry,BufferAttribute,Mesh,MeshStandardMaterial:class{},DoubleSide:2};
  const count=5000;
  const vertices=Array.from({length:count},(_,i)=>[i,i+1,i+2]);
  const faces=Array.from({length:count-2},(_,i)=>[i,i+1,i+2]);
  const asset={id:"big",kind:"mesh",status:"exact",meshes:[{vertices,faces}]};
  const project={referenceScenes:[{id:"one",tree:[{id:"node",geometry_instances:[{asset_id:"big",status:"exact"}],children:[]}],
    display_runtime:{scene_id:"one",assets:[asset],scale_mm_per_source_unit:1}}]};
  const jobs=[];const postTask=fn=>{jobs.push(fn);return jobs.length;};
  const parent=new Group();const ui=window.TubeBenderReferenceSceneUi;
  const h=ui.render3DCooperative({parent,project,THREE,postTask,cancelTask(){},batchSize:1});
  let ticks=0;
  while(jobs.length&&ticks<30){jobs.shift()();ticks++;}
  assert.equal(h.status.committed,true);
  assert.ok(ticks>4,"large mesh must yield across multiple scheduled tasks");
  assert.equal(parent.children.length,1);
  const buffer=parent.children[0].children[0].children[0].children[0].children[0].geometry;
  assert.equal(buffer.positions.array.length,count*3);
  assert.equal(buffer.indices.array.length,(count-2)*3);
  assert.equal(buffer.positions.array[3],1);
  assert.equal(buffer.indices.array[3],1);
});
