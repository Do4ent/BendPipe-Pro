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


test("A60: project tree is decorated as a classic TreeView",()=>{
  const source=fs.readFileSync(
    path.join(root,"src","ui","object-selection-context-ui.js"),
    "utf8"
  );

  assert.match(source,/function decorateProjectTreeAsTreeView\(\)/);
  assert.match(source,/host\.setAttribute\("role","tree"\)/);
  assert.match(source,/row\.setAttribute\("role","treeitem"\)/);
  assert.match(source,/row\.setAttribute\("aria-level",String\(depth\+1\)\)/);
  assert.match(source,/tb-project-treeview/);
  assert.match(source,/tb-treeview-row/);
  assert.match(source,/data-treeview-depth/);
  assert.match(source,/border-left:1px solid rgba\(128,151,178,.38\)/);
  assert.match(source,/border-top:1px solid rgba\(128,151,178,.38\)/);
  assert.match(source,/decorateProjectTreeAsTreeView\(\);[\s\S]*updateTreeSelectionStyles\(\);/);
});


test("A61: reference deletion prompts only for changed frame dimensions and preserves world placement",()=>{
  const source=fs.readFileSync(
    path.join(root,"src","ui","object-selection-context-ui.js"),
    "utf8"
  );

  assert.match(source,/previewDeleteFrame\?\.\(p\)/);
  assert.match(source,/function shouldApplyReferenceFrame\(projectValue,preview\)/);
  assert.match(source,/const dimensionsChanged=frameChanged\(current,next\)/);
  assert.match(source,/if\(!dimensionsChanged\)return true/);
  assert.match(source,/window\.confirm\(message\)/);
  assert.match(source,/Текущая: /);
  assert.match(source,/Новая: /);
  assert.match(source,/function applyReferenceFrame\(projectValue,frame\)/);
  assert.match(source,/x:oldOffset\.x-nextOffset\.x/);
  assert.match(source,/physical_world_position_preserved:true/);
  assert.match(source,/projectValue\.bbox=\{\.\.\.frame\.bbox\}/);
  assert.match(source,/projectValue\.coordinateOffset=\{\.\.\.nextOffset\}/);
});


test("A66: invalid tube element context exposes What is wrong diagnosis only for bad rows",()=>{
  const code=fs.readFileSync(
    path.join(root,"src","ui","object-selection-context-ui.js"),
    "utf8"
  );

  assert.match(code,/data-object-action="diagnose"/);
  assert.match(code,/Что не правильно\?/);
  assert.match(code,/function invalidElementDiagnosis\(entries=selectionEntries\(\)\)/);
  assert.match(code,/entries\.length!==1/);
  assert.match(code,/entry\?\.kind!=="row"/);
  assert.match(code,/typeof tubeRowValidationIssues==="function"/);
  assert.match(code,/if\(!issues\.length\)return null/);
  assert.match(code,/diagnose\.hidden=endSelection\|\|!diagnosis/);
  assert.match(code,/diagnose\.disabled=endSelection\|\|!diagnosis/);
  assert.match(code,/else if\(action==="diagnose"\)openInvalidElementDiagnosis\(\)/);
  assert.match(code,/tb-object-issues-panel/);
  assert.match(code,/diagnosis\.issues\.forEach/);
  assert.match(code,/tb-object-issue-marker/);
});


test("A67: tube-end context exposes anchor fix-release action only for the end point",()=>{
  const code=fs.readFileSync(
    path.join(root,"src","ui","object-selection-context-ui.js"),
    "utf8"
  );

  assert.match(code,/end:"end:"/);
  assert.match(code,/function endKey\(tubeId\)/);
  assert.match(code,/kind:"end"/);
  assert.match(code,/\[data-tree-end\]/);
  assert.match(code,/data\.tubeEnd&&activeTubeId\(\)/);
  assert.match(code,/data-object-action="anchor-end"/);
  assert.match(code,/⚓ <span>Зафиксировать<\/span>/);
  assert.match(code,/function endConstraintSelection\(entries=selectionEntries\(\)\)/);
  assert.match(code,/entry\?\.kind!=="end"/);
  assert.match(code,/function toggleEndConstraint\(\)/);
  assert.match(code,/api\.setEndConstraint\(selectedEnd\.tube,makeFixed\)/);
  assert.match(code,/label\.textContent=endSelection\?\.fixed\?"Освободить":"Зафиксировать"/);
  assert.match(code,/if\(endSelection\)\{[\s\S]*button\.dataset\.objectAction!=="anchor-end"/);
  assert.match(code,/object\.userData\?\.tubeEnd===true/);
});


test("accepted box and lasso 3D selection use modifier drag without stealing normal orbit",()=>{
  const code=fs.readFileSync(path.join(root,"src","ui","object-selection-context-ui.js"),"utf8");
  assert.match(code,/function beginAreaSelection/);
  assert.match(code,/event\.shiftKey\|\|event\.altKey/);
  assert.match(code,/mode:event\.altKey\?"lasso":"box"/);
  assert.match(code,/function pointInPolygon/);
  assert.match(code,/projectedSelectionCandidates/);
  assert.match(code,/tubebender-selection-change/);
  assert.match(code,/addEventListener\("pointerdown"/);
  assert.match(code,/addEventListener\("pointermove"/);
  assert.match(code,/addEventListener\("pointerup"/);
});


test("question 53: 3D hover exposes exact snap candidate seeds for tracking",()=>{
  const code=fs.readFileSync(path.join(root,"src","ui","object-selection-context-ui.js"),"utf8");
  assert.match(code,/function snapCandidatesAtEvent\(event\)/);
  assert.match(code,/function nearestGeometryVertex\(hit\)/);
  assert.match(code,/type:"Endpoint"/);
  assert.match(code,/\["Midpoint","mid"/);
  assert.match(code,/type:"Node"/);
  assert.match(code,/type:"Vertex"/);
  assert.match(code,/snapCandidatesAtEvent,/);
});
