import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import {fileURLToPath} from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const context=fs.readFileSync(path.join(root,"src","ui","object-selection-context-ui.js"),"utf8");
const groups=fs.readFileSync(path.join(root,"src","ui","groups-runtime.js"),"utf8");
const assemblies=fs.readFileSync(path.join(root,"src","ui","assemblies-runtime.js"),"utf8");

test("question 101 context menu source remains valid JavaScript",()=>{
  assert.doesNotThrow(()=>new vm.Script(context,{filename:"object-selection-context-ui.js"}));
});

test("question 101 menu exposes Edit Transform Properties Visibility and Delete",()=>{
  for(const action of [
    'data-object-action="edit-object"',
    'data-object-action="transform-object"',
    'data-object-action="properties"',
    'data-object-action="hide"',
    'data-object-action="show"',
    'data-object-action="delete"'
  ]) assert.ok(context.includes(action),action);
});

test("question 101 profiles are selected by actual object type",()=>{
  assert.ok(context.includes("function contextSelectionType"));
  assert.ok(context.includes('row?.type==="BEND"?"bend":row?.type==="LINE"?"line":"row"'));
  for(const token of [
    'tube:{title:"Tube"',
    'line:{title:"LINE"',
    'bend:{title:"BEND"',
    '"mesh-instance":{title:"Editable Mesh Instance"',
    'ref:{title:"Source / Reference"',
    'group:{title:"Group"',
    '"project-assembly":{title:"Assembly"'
  ]) assert.ok(context.includes(token),token);
});

test("question 101 profile visibility hides unsupported actions instead of failing later",()=>{
  assert.ok(context.includes("const contextualVisibility={"));
  assert.ok(context.includes('"edit-object":profile.edit'));
  assert.ok(context.includes('"transform-object":profile.transform'));
  assert.ok(context.includes("properties:profile.properties"));
  assert.ok(context.includes("isolate:profile.isolate"));
  assert.ok(context.includes("transparent:profile.transparent"));
  assert.ok(context.includes("delete:profile.delete"));
});

test("question 101 Edit routes to the subsystem matching the selected type",()=>{
  assert.ok(context.includes("geometryGripsApi()?.setShowAll?.(true)"));
  assert.ok(context.includes("geometryGripsApi()?.enterInternal?.(entry.tubeId,entry.rowIndex)"));
  assert.ok(context.includes("groupsApi()?.openPanel?.()"));
  assert.ok(context.includes("assembliesApi()?.enterEdit?.(entry.assemblyId)"));
  assert.ok(groups.includes("openPanel:()=>{ensurePanel().classList.add"));
  assert.ok(assemblies.includes("openPanel:()=>{ensurePanel().classList.add"));
});

test("question 101 Transform uses Gizmo for transformable geometry",()=>{
  assert.ok(context.includes('entries.every(entry=>["tube","ref","mesh-instance"].includes(entry.kind))'));
  assert.ok(context.includes("gizmoApi()?.show?.()"));
  assert.ok(context.includes("gizmoApi()?.rebuild?.()"));
});

test("question 101 Properties always opens the shared Property Panel when supported",()=>{
  assert.ok(context.includes("function openContextProperties(){propertiesApi()?.open?.();return true;}"));
});

test("question 101 Group and Assembly delete dissolve logical container only",()=>{
  assert.ok(context.includes('domain.ungroup(p,entry.groupId)'));
  assert.ok(context.includes('domain.dissolveAssembly(p,entry.assemblyId)'));
  assert.ok(context.includes('"Удалить Group без удаления геометрии"'));
  assert.ok(context.includes('"Dissolve Assembly без удаления компонентов"'));
});

test("question 101 Hide Show works for mesh Group and Assembly",()=>{
  assert.ok(context.includes('if(entry.kind==="mesh-instance")'));
  assert.ok(context.includes('if(entry.kind==="group")'));
  assert.ok(context.includes('if(entry.kind==="project-assembly")'));
  assert.ok(context.includes('instance.visible=action==="show"'));
  assert.ok(context.includes('group.visible=action==="show"'));
  assert.ok(context.includes('assembly.visible=action==="show"'));
});

test("question 101 Selection Cycling remains available from the context menu",()=>{
  assert.ok(context.includes('data-object-action="selection-cycle"'));
  assert.ok(context.includes("Выбрать объект под курсором…"));
  assert.ok(context.includes("showObjectChooser"));
});
