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

test("A26/Q61: grouped delete is blocked because Source Reference is immutable",()=>{
  const api=loadUi();
  const project=sampleProject();
  api.selectNode(project,"scene-1","root",true);
  const before=JSON.stringify(project.referenceScenes);

  assert.throws(
    ()=>api.applyBulkAction(project,"delete"),
    /Immutable Source \/ Reference/
  );

  assert.equal(JSON.stringify(project.referenceScenes),before);
  assert.equal(project.referenceScenes.length,1);
  assert.equal(project.tubes.length,1);
});

test("A26/Q61: an all-readonly Source scene cannot be deleted through grouped actions",()=>{
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
  assert.throws(
    ()=>api.applyBulkAction(project,"delete"),
    /Immutable Source \/ Reference/
  );
  assert.equal(project.referenceScenes.length,1);
  assert.equal(api.selectedCount(project),1);
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


function nestedTreeProject(){
  return {
    id:"nested",
    tubes:[],
    referenceScenes:[{
      id:"scene-nested",
      name:"assembly.dwfx",
      source_file:"assembly.dwfx",
      tree:[{
        id:"assembly",
        label:"Main Assembly",
        readonly:true,
        geometry_status:"group",
        geometry_instances:[],
        children:[{
          id:"sub",
          label:"Subassembly A",
          readonly:true,
          geometry_status:"group",
          geometry_instances:[],
          children:[{
            id:"component",
            label:"Bracket 42",
            readonly:true,
            geometry_status:"exact",
            geometry_instances:[{asset_id:"42",status:"exact"}],
            children:[]
          }]
        }]
      }]
    }]
  };
}

test("A28: imported geometry is rendered as a nested project-tree branch",()=>{
  const api=loadUi();
  const project=nestedTreeProject();
  const html=api.treeItems({project}).join("\n");

  const root=html.indexOf("Импортированная геометрия");
  const file=html.indexOf("assembly.dwfx");
  const assembly=html.indexOf("Main Assembly");
  const sub=html.indexOf("Subassembly A");
  const component=html.indexOf("Bracket 42");

  assert.ok(root>=0);
  assert.ok(file>root);
  assert.ok(assembly>file);
  assert.ok(sub>assembly);
  assert.ok(component>sub);
  assert.match(html,/data-ref-root-toggle="1"/);
  assert.match(html,/data-ref-scene-toggle="scene-nested"/);
  assert.match(html,/data-ref-toggle="assembly"/);
  assert.match(html,/data-ref-toggle="sub"/);
});

test("A28: imported-geometry root and DWFx file can be collapsed independently",()=>{
  const api=loadUi();
  const project=nestedTreeProject();

  project.referenceGeometryTreeCollapsed=true;
  let html=api.treeItems({project}).join("\n");
  assert.match(html,/Импортированная геометрия/);
  assert.doesNotMatch(html,/assembly\.dwfx/);
  assert.doesNotMatch(html,/Main Assembly/);

  project.referenceGeometryTreeCollapsed=false;
  project.referenceScenes[0].treeCollapsed=true;
  html=api.treeItems({project}).join("\n");
  assert.match(html,/assembly\.dwfx/);
  assert.doesNotMatch(html,/Main Assembly/);

  project.referenceScenes[0].treeCollapsed=false;
  project.referenceScenes[0].collapsedNodeIds=["assembly"];
  html=api.treeItems({project}).join("\n");
  assert.match(html,/Main Assembly/);
  assert.doesNotMatch(html,/Subassembly A/);
  assert.doesNotMatch(html,/Bracket 42/);
});

test("A28: tree search expands collapsed reference levels for matching imported component",()=>{
  const api=loadUi();
  const project=nestedTreeProject();
  project.referenceGeometryTreeCollapsed=true;
  project.referenceScenes[0].treeCollapsed=true;
  project.referenceScenes[0].collapsedNodeIds=["assembly","sub"];

  const html=api.treeItems({project,query:"bracket 42"}).join("\n");
  assert.match(html,/Импортированная геометрия/);
  assert.match(html,/assembly\.dwfx/);
  assert.match(html,/Main Assembly/);
  assert.match(html,/Subassembly A/);
  assert.match(html,/Bracket 42/);
});


test("A61: deleting an imported component previews a tighter exact project frame",()=>{
  const api=loadUi();
  const identity=[
    1,0,0,0,
    0,1,0,0,
    0,0,1,0,
    0,0,0,1
  ];
  const project={
    id:"frame-delete",
    bbox:{x:110,y:10,z:10},
    coordinateOffset:{x:0,y:0,z:0},
    tubes:[],
    referenceScenes:[{
      id:"scene-frame",
      runtime_scene_id:"scene-frame",
      scale_mm_per_source_unit:1,
      tree:[
        {
          id:"left",
          label:"Left component",
          readonly:true,
          geometry_status:"exact",
          geometry_instances:[{
            asset_id:"left-asset",
            placement_matrix:identity,
            status:"exact"
          }],
          children:[]
        },
        {
          id:"right",
          label:"Right component",
          readonly:true,
          geometry_status:"exact",
          geometry_instances:[{
            asset_id:"right-asset",
            placement_matrix:identity,
            status:"exact"
          }],
          children:[]
        }
      ]
    }]
  };

  api.registerRuntime({
    scene_id:"scene-frame",
    scale_mm_per_source_unit:1,
    assets:[
      {
        id:"left-asset",
        status:"exact",
        kind:"mesh",
        meshes:[{
          vertices:[[0,0,0],[10,10,10]],
          matrix:identity
        }],
        nested_instances:[]
      },
      {
        id:"right-asset",
        status:"exact",
        kind:"mesh",
        meshes:[{
          vertices:[[100,0,0],[110,10,10]],
          matrix:identity
        }],
        nested_instances:[]
      }
    ]
  });

  api.selectNode(project,"scene-frame","right",true);
  const preview=api.previewDeleteFrame(project);

  assert.equal(preview.status,"exact");
  assert.deepEqual(
    JSON.parse(JSON.stringify(preview.frame.bbox)),
    {x:10,y:10,z:10}
  );
  assert.deepEqual(
    JSON.parse(JSON.stringify(preview.frame.coordinateOffset)),
    {x:0,y:0,z:0}
  );
  assert.equal(project.referenceScenes[0].tree.length,2);
});


test("Q61: Source and Editable appear as separate tree branches and Source has no delete action",()=>{
  const api=loadUi();
  const project=sampleProject();
  const html=api.treeItems({project}).join("\n");

  assert.match(html,/Source \/ Reference/);
  assert.match(html,/Editable geometry/);
  assert.doesNotMatch(html,/data-ref-bulk-action="delete"/);
});

test("Q61: public reference actions reject Source deletion",()=>{
  const api=loadUi();
  const project=sampleProject();
  api.selectNode(project,"scene-1","ref-a",true);
  assert.throws(
    ()=>api.applyBulkAction(project,"delete"),
    /Immutable Source \/ Reference/
  );
  assert.equal(project.referenceScenes[0].tree[0].children.some((node)=>node.id==="ref-a"),true);
});
