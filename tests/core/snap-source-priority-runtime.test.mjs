import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const runtime=fs.readFileSync(path.join(root,"src","ui","snap-tracking-runtime.js"),"utf8");
const selection=fs.readFileSync(path.join(root,"src","ui","object-selection-context-ui.js"),"utf8");

test("question 89: Snap source controls are valid classic JavaScript",()=>{
  assert.doesNotThrow(()=>new vm.Script(runtime,{filename:"snap-tracking-runtime.js"}));
  assert.match(runtime,/Snap source priority/);
  assert.match(runtime,/data-snap-source-enabled/);
  assert.match(runtime,/data-snap-source-up/);
  assert.match(runtime,/data-snap-source-down/);
});

test("question 89: user source order and enabled state are persistent",()=>{
  assert.match(runtime,/SOURCE_PREF_KEY/);
  assert.match(runtime,/localStorage\.setItem\(SOURCE_PREF_KEY/);
  assert.match(runtime,/setSourceEnabled/);
  assert.match(runtime,/setSourceOrder/);
  assert.match(runtime,/source_priority:\{\.\.\.\(base\.source_priority/);
  assert.match(runtime,/source_enabled:\{\.\.\.\(base\.source_enabled/);
});

test("question 89: Source and mesh can be excluded temporarily per command",()=>{
  assert.match(runtime,/temporaryExternalExcluded/);
  assert.match(runtime,/out\.SourceReference=false/);
  assert.match(runtime,/out\.MeshFitted=false/);
  assert.match(runtime,/exclude_source_mesh===true/);
  assert.match(runtime,/temporaryExternalExcluded=false;renderSourcePanel\(\)/);
  assert.match(runtime,/Временно исключить Source \/ mesh/);
});

test("question 89: 3D candidate classification exposes independent source classes",()=>{
  assert.match(selection,/source="MeshFitted"/);
  assert.match(selection,/source="SourceReference"/);
  assert.match(selection,/source="Construction"/);
  assert.match(selection,/source="Tube"/);
  assert.match(selection,/referenceEditableInstanceId/);
});
