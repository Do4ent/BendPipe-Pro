import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");

function loadReferenceUi(){
  const code=fs.readFileSync(
    path.join(root,"src","import","dwfx","reference-scene-ui.js"),
    "utf8"
  );
  const sandbox={window:{}};
  vm.runInNewContext(code,sandbox,{filename:"reference-scene-ui.js"});
  return sandbox.window.TubeBenderReferenceSceneUi;
}

test("A48: reference selection movement translates only selected top-level branch",()=>{
  const ui=loadReferenceUi();
  const project={
    referenceScenes:[{
      id:"scene",
      tree:[{
        id:"group",
        label:"Group",
        children:[{
          id:"leaf",
          label:"Leaf",
          geometry_instances:[],
          children:[]
        }]
      }]
    }]
  };

  assert.equal(ui.selectNode(project,"scene","group",true),2);
  assert.deepEqual(Array.from(ui.selectedKeys(project)).sort(),["scene|group","scene|leaf"]);
  assert.equal(ui.moveSelection(project,{x:10,y:-5,z:2}),1);
  assert.equal(project.referenceScenes[0].tree[0].translation_mm.x,10);
  assert.equal(project.referenceScenes[0].tree[0].translation_mm.y,-5);
  assert.equal(project.referenceScenes[0].tree[0].translation_mm.z,2);
  assert.equal("translation_mm" in project.referenceScenes[0].tree[0].children[0],false);
});

test("A48: reference selection can be replaced by one 3D-picked leaf",()=>{
  const ui=loadReferenceUi();
  const project={
    referenceScenes:[{
      id:"scene",
      tree:[{
        id:"a",label:"A",geometry_instances:[],children:[]
      },{
        id:"b",label:"B",geometry_instances:[],children:[]
      }]
    }]
  };

  ui.replaceSelection(project,["scene|b"]);
  assert.deepEqual(Array.from(ui.selectedKeys(project)),["scene|b"]);
  assert.equal(ui.moveSelection(project,{x:1,y:2,z:3}),1);
  assert.equal(project.referenceScenes[0].tree[1].translation_mm.x,1);
  assert.equal(project.referenceScenes[0].tree[1].translation_mm.y,2);
  assert.equal(project.referenceScenes[0].tree[1].translation_mm.z,3);
  assert.equal("translation_mm" in project.referenceScenes[0].tree[0],false);
});

test("A48: object context UI remains valid classic JavaScript",()=>{
  const code=fs.readFileSync(
    path.join(root,"src","ui","object-selection-context-ui.js"),
    "utf8"
  );
  assert.doesNotThrow(()=>new vm.Script(code,{filename:"object-selection-context-ui.js"}));
  assert.match(code,/data-object-action="move"/);
  assert.match(code,/data-object-action="hide"/);
  assert.match(code,/data-object-action="show"/);
  assert.match(code,/data-object-action="transparent"/);
  assert.match(code,/data-object-action="delete"/);
});


test("A52: reference selection API keeps active and bulk selection synchronized",()=>{
  const ui=loadReferenceUi();
  const project={
    referenceGeometryTreeCollapsed:true,
    referenceScenes:[{
      id:"scene",
      treeCollapsed:true,
      collapsedNodeIds:["group","leaf"],
      tree:[{
        id:"group",
        label:"Group",
        geometry_instances:[],
        children:[{
          id:"leaf",
          label:"Leaf",
          geometry_instances:[],
          children:[]
        }]
      }]
    }]
  };

  ui.replaceSelection(project,["scene|leaf"]);
  assert.deepEqual(Array.from(ui.selectedKeys(project)),["scene|leaf"]);

  assert.equal(ui.revealNode(project,"scene","leaf"),true);
  assert.equal(project.referenceGeometryTreeCollapsed,false);
  assert.equal(project.referenceScenes[0].treeCollapsed,false);
  assert.equal(project.referenceScenes[0].collapsedNodeIds.includes("group"),false);
  assert.deepEqual(Array.from(ui.selectedKeys(project)),["scene|leaf"]);

  ui.clearSelection();
  assert.deepEqual(Array.from(ui.selectedKeys(project)),[]);
});

test("A52: object context exposes bidirectional tree/3D synchronization",()=>{
  const code=fs.readFileSync(
    path.join(root,"src","ui","object-selection-context-ui.js"),
    "utf8"
  );

  assert.match(code,/function adoptReferenceSelection/);
  assert.match(code,/function revealTreeKey/);
  assert.match(code,/refApi\(\)\?\.revealNode/);
  assert.match(code,/scrollIntoView\?\.\(\{block:"nearest",inline:"nearest",behavior:"auto"\}\)/);
  assert.match(code,/revealTreeKey\(picked\.key\)/);
  assert.match(code,/row\.classList\.add\("tb-object-selected"\)/);
  assert.match(code,/row\.setAttribute\("aria-selected","true"\)/);
});


test("A54: right-drag orbit suppresses the 3D context menu",()=>{
  const code=fs.readFileSync(
    path.join(root,"src","ui","object-selection-context-ui.js"),
    "utf8"
  );
  assert.match(code,/function onCanvasContext\(event\)/);
  assert.match(code,/controls\?\.shouldSuppressSelection\?\.\(\)/);
  assert.match(code,/event\.preventDefault\(\);[\s\S]*event\.stopPropagation\(\);[\s\S]*return;/);
});


test("A55: recognized imported tubes are always rendered fully opaque",()=>{
  const code=fs.readFileSync(
    path.join(root,"src","ui","object-selection-context-ui.js"),
    "utf8"
  );

  assert.match(code,/function isRecognizedTube\(tube\)/);
  assert.match(code,/return !!tube\?\.importEvidence/);
  assert.match(code,/if\(isRecognizedTube\(tube\)\)\{[\s\S]*tube\.uiTransparentIn3D=false/);
  assert.match(code,/applyMaterialOpacity\(object,1\)/);
  assert.match(code,/return !isRecognizedTube\(tube\)/);
  assert.match(code,/row\.uiTransparentIn3D=false/);
});


test("A57: project-tree context menu survives dynamic buildShell creation and rerenders",()=>{
  const code=fs.readFileSync(
    path.join(root,"src","ui","object-selection-context-ui.js"),
    "utf8"
  );

  assert.match(code,/function projectTreeForEvent\(event\)/);
  assert.match(code,/document\.getElementById\("tbProjectTree"\)/);
  assert.match(code,/tree===target\|\|tree\.contains\(target\)/);
  assert.match(code,/document\.addEventListener\("click",onTreeClick\)/);
  assert.match(code,/document\.addEventListener\("contextmenu",onTreeContext,true\)/);
  assert.doesNotMatch(code,/tree\?\.addEventListener\("contextmenu",onTreeContext\)/);
  assert.match(code,/treeObserver\.observe\(document\.body,\{childList:true,subtree:true\}\)/);
});


test("A58: every object context menu exposes Hide Others and isolates editable objects",()=>{
  const code=fs.readFileSync(
    path.join(root,"src","ui","object-selection-context-ui.js"),
    "utf8"
  );

  assert.match(code,/data-object-action="isolate"/);
  assert.match(code,/Скрыть другие/);
  assert.match(code,/function isolateEditableSelection\(entries,projectValue\)/);
  assert.match(code,/tube\.uiHiddenIn3D=true/);
  assert.match(code,/row\.uiHiddenIn3D=!keep/);
  assert.match(code,/else if\(action==="isolate"\)/);
  assert.match(code,/refApi\(\)\?\.isolateSelection\?\.\(p\)/);
  assert.match(code,/isolate:"Скрыть другие объекты"/);
});


test("A59: Show All restores all editable and reference visibility from tree or 3D context",()=>{
  const referenceUi=loadReferenceUi();
  const project={
    referenceScenes:[{
      id:"scene-a",
      visible:false,
      hiddenNodeIds:["group","leaf"],
      tree:[{
        id:"group",
        label:"Group",
        geometry_instances:[],
        children:[{
          id:"leaf",
          label:"Leaf",
          geometry_instances:[],
          children:[]
        }]
      }]
    }]
  };

  assert.equal(referenceUi.showAll(project),3);
  assert.equal(project.referenceScenes[0].visible,true);
  assert.deepEqual(Array.from(project.referenceScenes[0].hiddenNodeIds),[]);

  const code=fs.readFileSync(
    path.join(root,"src","ui","object-selection-context-ui.js"),
    "utf8"
  );
  assert.match(code,/data-object-action="show-all"/);
  assert.match(code,/Показать все/);
  assert.match(code,/function showAllObjects\(projectValue\)/);
  assert.match(code,/tube\.uiHiddenIn3D=false/);
  assert.match(code,/row\.uiHiddenIn3D=false/);
  assert.match(code,/refApi\(\)\?\.showAll\?\.\(projectValue\)/);
  assert.match(code,/source:"3d",allowEmpty:true,selectionAvailable:false/);
  assert.match(code,/source:"tree",allowEmpty:true,selectionAvailable:false/);
});
