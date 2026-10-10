import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

test("render hook tracks project identity and in-place DWFx scenes replacement",()=>{
  const source=fs.readFileSync(new URL("../../scripts/build-standalone.mjs",import.meta.url),"utf8");
  const start=source.indexOf("const legacyProjectSwitchHook=");
  const end=source.indexOf("output=output.replace(legacyProjectSwitchAnchor,",start);
  assert.ok(start>=0&&end>start);
  const generator={};
  vm.runInNewContext(source.slice(start,end)+"\nthis.generated=legacyProjectSwitchHook;",generator);
  const calls=[];
  let project={id:"A",referenceScenes:[]};
  const context={
    activeProject:()=>project,
    window:{TubeBenderReferenceSceneUi:{markSceneChanged:(value,kind)=>calls.push([value,kind])}}
  };
  vm.createContext(context);
  vm.runInContext(generator.generated+"\nthis.track=tbTrackReferenceProjectSwitch;",context);
  context.track();
  context.track();
  assert.equal(calls.length,0);
  project.referenceScenes=[{id:"new"}];
  context.track();
  assert.equal(calls.length,1);
  assert.equal(calls[0][0],project);
  assert.equal(calls[0][1],"geometry");
  context.track();
  assert.equal(calls.length,1);
  project={id:"B",referenceScenes:[]};
  context.track();
  assert.equal(calls.length,2);
});
