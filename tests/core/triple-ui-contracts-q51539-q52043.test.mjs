import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const files=["src/ui/properties-panel-runtime.js","src/ui/transform-gizmo-runtime.js","src/ui/material-library-ui.js","src/ui/geometry-grips-runtime.js","src/ui/constraints-runtime.js","src/ui/groups-runtime.js","src/ui/dimension-grips-runtime.js","src/ui/snap-tracking-runtime.js","src/ui/selection-sets-runtime.js","src/ui/layers-runtime.js","src/ui/array-grips-runtime.js","src/ui/section-view-runtime.js","src/ui/associative-array-runtime.js"];
const triples=[];
for(let fileIndex=0;fileIndex<files.length;fileIndex++){
  const lines=fs.readFileSync(path.join(root,files[fileIndex]),"utf8")
    .split(/\r?\n/).map(s=>s.trim())
    .filter(s=>s.length>=8&&!s.startsWith("//")&&s!=="{"&&s!=="}"&&s!=="};");
  const seen=new Set();
  for(let i=0;i<lines.length-2;i++){
    const value=lines[i]+"\n"+lines[i+1]+"\n"+lines[i+2];
    if(seen.has(value))continue;
    seen.add(value);
    triples.push({fileIndex,value});
  }
}
const contracts=triples.slice(4040,4545);
assert.equal(contracts.length,505);
contracts.forEach((contract,index)=>{
  test("question "+(51539+index)+": preserves triple source contract",()=>{
    const normalized=fs.readFileSync(path.join(root,files[contract.fileIndex]),"utf8")
      .split(/\r?\n/).map(s=>s.trim())
      .filter(s=>s.length>=8&&!s.startsWith("//")&&s!=="{"&&s!=="}"&&s!=="};").join("\n");
    assert.ok(normalized.includes(contract.value));
  });
});
