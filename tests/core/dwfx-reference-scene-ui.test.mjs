import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const sourcePath=path.join(root,"src","import","dwfx","reference-scene-ui.js");
const code=fs.readFileSync(sourcePath,"utf8");

function runtime(){
  const context=vm.createContext({window:{},queueMicrotask});
  new vm.Script(code,{filename:"reference-scene-ui.js"}).runInContext(context);
  return context.window.TubeBenderReferenceSceneUi;
}

function projectFixture(){
  return {
    referenceScenes:[{
      id:"source-scene",
      source_file:"sample.dwfx",
      readonly:true,
      visible:true,
      tree:[{
        id:"tube-node",
        label:"10102202 source",
        editable_part_number:"10102202",
        geometry_status:"exact",
        geometry_instances:[],
        children:[]
      }]
    }],
    tubes:[{
      id:"editable-1",
      name:"10102202",
      partNumber:"10102202",
      rows:[{type:"LINE",L:100}],
      currentProjectImport:{
        source_format:"DWFx",
        part_number:"10102202",
        source_link:{
          status:"linked",
          detached:false,
          scene_id:"source-scene",
          node_id:"tube-node",
          part_number:"10102202",
          source_label:"10102202 source",
          source_file:"sample.dwfx",
          display:"hidden"
        },
        source_geometry_snapshot:{
          schema:"dwfx_editable_source_geometry_v1",
          rows:[{type:"LINE",L:100}]
        }
      }
    }]
  };
}

test("question 61: imported tree is split into immutable Source Reference and Editable geometry",()=>{
  const api=runtime();
  const html=api.treeItems({project:projectFixture(),query:""}).join("\n");
  assert.match(html,/Source \/ Reference/);
  assert.match(html,/неизменяемый исходник/);
  assert.match(html,/Editable geometry/);
  assert.match(html,/data-import-editable-tube="editable-1"/);
  assert.match(html,/Source ↔ Editable/);
  assert.doesNotMatch(html,/data-ref-bulk-action="delete"/);
});

test("question 61: Source delete is rejected by the public bulk action API",()=>{
  const api=runtime();
  assert.throws(
    ()=>api.applyBulkAction(projectFixture(),"delete"),
    /Immutable Source \/ Reference/
  );
});

test("question 61: linked Editable context menu has Show Hide Compare Restore and Break link",()=>{
  for(const label of [
    "Показать исходник",
    "Скрыть исходник",
    "Сравнить с исходником",
    "Восстановить из исходника",
    "Разорвать связь с исходником"
  ])assert.ok(code.includes(label),label);
  assert.match(code,/mutateSourceLinkDisplay\(tube,"shown"\)/);
  assert.match(code,/mutateSourceLinkDisplay\(tube,"hidden"\)/);
  assert.match(code,/mutateSourceLinkDisplay\(tube,"compare"\)/);
  assert.match(code,/restoreLinkedTubeGeometry\(tube\)/);
  assert.match(code,/breakSourceLink\(tube\)/);
});

test("question 61: selecting linked Editable reveals Source as transparent highlight",()=>{
  assert.match(code,/selectedEditableTubeIds/);
  assert.match(code,/selectedEditable\|\|display==="shown"\|\|display==="compare"/);
  assert.match(code,/transparent:selectedEditable\|\|display==="compare"/);
  assert.match(code,/sourceEditableHighlight/);
  assert.match(code,/\(nodeTransparent\|\|linkedState\?\.transparent\)\?"transparent":"normal"/);
});

test("question 61: Restore uses saved geometry snapshot without replacing tooling state",()=>{
  assert.match(code,/source_geometry_snapshot/);
  assert.match(code,/snapshot\.schema!=="dwfx_editable_source_geometry_v1"/);
  assert.match(code,/const fields=\[/);
  assert.match(code,/"origin","startVector","startAxis","startDir","rows"/);
  assert.doesNotMatch(
    code.slice(code.indexOf("function restoreLinkedTubeGeometry"),code.indexOf("function nodeTranslationMm")),
    /toolingId|machine_profile|tooling/
  );
});
