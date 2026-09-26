import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const uiPath=path.join(root,"src","import","dwfx","reference-scene-ui.js");

function loadUi(){
  const source=fs.readFileSync(uiPath,"utf8");
  const context=vm.createContext({window:{},console});
  new vm.Script(source,{filename:"reference-scene-ui.js"}).runInContext(context);
  return context.window.TubeBenderReferenceSceneUi;
}

function sampleProject(){
  return {
    id:"p",
    tubes:[{id:"tube-1",partNumber:"TUBE-1"}],
    referenceScenes:[{
      id:"scene-1",
      runtime_scene_id:"scene-1",
      source_file:"sample.dwfx",
      visible:true,
      tree:[{
        id:"root",
        label:"Assembly",
        readonly:true,
        role:"group",
        geometry_status:"group",
        geometry_instances:[{asset_id:"root-shape",status:"exact"}],
        children:[
          {
            id:"ref-a",
            label:"Bracket",
            readonly:true,
            role:"reference_object",
            geometry_status:"exact",
            geometry_instances:[{asset_id:"a",status:"exact"}],
            children:[]
          },
          {
            id:"tube-node",
            label:"Tube",
            readonly:true,
            role:"reference_object",
            editable_part_number:"TUBE-1",
            geometry_status:"exact",
            geometry_instances:[{asset_id:"tube",status:"exact"}],
            children:[]
          }
        ]
      }]
    }]
  };
}

test("A26: grouped reference selection excludes editable tube nodes",()=>{
  const api=loadUi();
  const project=sampleProject();

  assert.equal(api.selectNode(project,"scene-1","root",true),2);
  const html=api.treeItems({project}).join("\n");

  assert.match(html,/data-ref-select="root" checked/);
  assert.match(html,/data-ref-select="ref-a" checked/);
  assert.doesNotMatch(html,/data-ref-select="tube-node"/);
  assert.match(html,/Выбрано: 2/);
});

test("A26: grouped hide/show and transparency operate on selected readonly branch",()=>{
  const api=loadUi();
  const project=sampleProject();
  api.selectNode(project,"scene-1","root",true);

  api.applyBulkAction(project,"hide");
  assert.deepEqual(
    [...project.referenceScenes[0].hiddenNodeIds].sort(),
    ["ref-a","root"]
  );

  api.applyBulkAction(project,"show");
  assert.deepEqual(Array.from(project.referenceScenes[0].hiddenNodeIds),[]);

  api.applyBulkAction(project,"transparent");
  assert.deepEqual(
    [...project.referenceScenes[0].transparentNodeIds].sort(),
    ["ref-a","root"]
  );
  assert.match(api.treeItems({project}).join("\n"),/прозрачно/);

  api.applyBulkAction(project,"transparent");
  assert.deepEqual(Array.from(project.referenceScenes[0].transparentNodeIds),[]);
});

test("A26: grouped delete removes readonly geometry but preserves editable tube source branch",()=>{
  const api=loadUi();
  const project=sampleProject();
  api.selectNode(project,"scene-1","root",true);

  api.applyBulkAction(project,"delete");

  assert.equal(project.referenceScenes.length,1);
  const rootNode=project.referenceScenes[0].tree[0];
  assert.equal(rootNode.id,"root");
  assert.deepEqual(Array.from(rootNode.geometry_instances),[]);
  assert.equal(rootNode.children.length,1);
  assert.equal(rootNode.children[0].id,"tube-node");
  assert.equal(rootNode.children[0].editable_part_number,"TUBE-1");
  assert.equal(api.selectedCount(project),0);
  assert.equal(project.tubes.length,1);
});

test("A26: selecting an all-readonly scene and deleting it removes only that reference scene",()=>{
  const api=loadUi();
  const project={
    id:"p",
    tubes:[],
    referenceScenes:[{
      id:"scene-only",
      tree:[{
        id:"a",
        label:"A",
        readonly:true,
        geometry_status:"exact",
        geometry_instances:[{asset_id:"a",status:"exact"}],
        children:[]
      }]
    }]
  };

  assert.equal(api.selectScene(project,"scene-only",true),1);
  api.applyBulkAction(project,"delete");
  assert.equal(project.referenceScenes.length,0);
  assert.equal(api.selectedCount(project),0);
});


function flatProject(){
  return {
    id:"flat",
    tubes:[{id:"tube",partNumber:"EDIT"}],
    referenceScenes:[{
      id:"scene-flat",
      tree:[
        {id:"a",label:"A",readonly:true,geometry_status:"exact",geometry_instances:[],children:[]},
        {id:"b",label:"B",readonly:true,geometry_status:"exact",geometry_instances:[],children:[]},
        {id:"edit",label:"Editable",readonly:true,editable_part_number:"EDIT",geometry_status:"exact",geometry_instances:[],children:[]},
        {id:"c",label:"C",readonly:true,geometry_status:"exact",geometry_instances:[],children:[]},
        {id:"d",label:"D",readonly:true,geometry_status:"exact",geometry_instances:[],children:[]}
      ]
    }]
  };
}

test("A27: Ctrl-click toggles independent readonly components without clearing previous selection",()=>{
  const api=loadUi();
  const project=flatProject();
  const order=["a","b","c","d"].map((id)=>"scene-flat|"+id);

  assert.equal(api.applyModifierSelection(project,order,"scene-flat|a",{ctrlKey:true}),1);
  assert.equal(api.applyModifierSelection(project,order,"scene-flat|c",{ctrlKey:true}),2);
  assert.equal(api.applyModifierSelection(project,order,"scene-flat|a",{ctrlKey:true}),1);

  const html=api.treeItems({project}).join("\n");
  assert.doesNotMatch(html,/data-ref-select="a" checked/);
  assert.match(html,/data-ref-select="c" checked/);
  assert.doesNotMatch(html,/data-ref-select="edit"/);
});

test("A27: Shift-click selects a continuous visible readonly range from the anchor",()=>{
  const api=loadUi();
  const project=flatProject();
  const order=["a","b","c","d"].map((id)=>"scene-flat|"+id);

  assert.equal(api.applyModifierSelection(project,order,"scene-flat|a",{}),0);
  assert.equal(api.applyModifierSelection(project,order,"scene-flat|c",{shiftKey:true}),3);

  const html=api.treeItems({project}).join("\n");
  assert.match(html,/data-ref-select="a" checked/);
  assert.match(html,/data-ref-select="b" checked/);
  assert.match(html,/data-ref-select="c" checked/);
  assert.doesNotMatch(html,/data-ref-select="d" checked/);
});

test("A27: Ctrl+Shift-click adds a visible range to the existing grouped selection",()=>{
  const api=loadUi();
  const project=flatProject();
  const order=["a","b","c","d"].map((id)=>"scene-flat|"+id);

  assert.equal(api.applyModifierSelection(project,order,"scene-flat|d",{ctrlKey:true}),1);
  assert.equal(api.applyModifierSelection(project,order,"scene-flat|a",{}),1);
  assert.equal(
    api.applyModifierSelection(
      project,
      order,
      "scene-flat|b",
      {ctrlKey:true,shiftKey:true}
    ),
    3
  );

  const html=api.treeItems({project}).join("\n");
  assert.match(html,/data-ref-select="a" checked/);
  assert.match(html,/data-ref-select="b" checked/);
  assert.match(html,/data-ref-select="d" checked/);
  assert.doesNotMatch(html,/data-ref-select="c" checked/);
});
