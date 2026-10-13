import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const code=fs.readFileSync(path.join(root,"src","ui","editing-ui.js"),"utf8");

test("Editing UI exposes Mirror beside Rotate and Array",()=>{
  assert.doesNotThrow(()=>new vm.Script(code,{filename:"editing-ui.js"}));
  assert.match(code,/data-tool="mirror">Mirror/);
  assert.match(code,/function createMirrorFromSelection/);
  assert.match(code,/function mirrorPanelHtml/);
  assert.match(code,/data-mirror-mode/);
  assert.match(code,/data-mirror-plane/);
});

test("Mirror Copy is associative by default and Mirror Original is explicit non-associative",()=>{
  assert.match(code,/data-mirror-associative type="checkbox" checked/);
  assert.match(code,/mode==="Original"&&associative/);
  assert.match(code,/Associative Mirror для Original пока не применяется/);
  assert.match(code,/runtime\.addAssociativeCopy/);
  assert.match(code,/runtime\.createIndependentCopy/);
  assert.match(code,/runtime\.mirrorOriginal/);
});

test("Editing UI refuses direct transform of derived Mirror members",()=>{
  assert.match(code,/tube\?\.mirror_member\?\.derived_readonly!==true/);
  assert.match(code,/tube\?\.array_member\?\.derived_readonly!==true/);
});

test("Mirror UI supports Break and Delete for associative copies",()=>{
  assert.match(code,/data-mirror-break/);
  assert.match(code,/data-mirror-delete/);
  assert.match(code,/runtime\.breakMirror/);
  assert.match(code,/runtime\.deleteMirror/);
});
