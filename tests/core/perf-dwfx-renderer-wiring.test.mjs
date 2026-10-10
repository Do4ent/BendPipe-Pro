import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

test("main viewport uses cooperative DWFx reference geometry when available",()=>{
  const source=fs.readFileSync(new URL("../../scripts/build-standalone.mjs",import.meta.url),"utf8");
  assert.match(source,/referenceUi\.render3DCooperative\(/);
  assert.match(source,/parent:pipeGroup,project:referenceProject/);
  assert.match(source,/onCommit:\(\)=>/);
  assert.match(source,/renderer\.render\(scene,camera\)/);
  assert.match(source,/referenceUi\?\.render3D\?\./);
});
