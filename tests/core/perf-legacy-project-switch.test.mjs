import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

test("legacy viewport project-identity hook detects open/replace once per identity",()=>{
  const builder=fs.readFileSync(new URL("../../scripts/build-standalone.mjs",import.meta.url),"utf8");
  const start=builder.indexOf("const legacyProjectSwitchHook=");
  const end=builder.indexOf("output=output.replace(legacyProjectSwitchAnchor,",start);
  assert.ok(start>=0&&end>start);
  const segment=builder.slice(start,end);
  const harness={};
  vm.runInNewContext(segment+"\nthis.generated=legacyProjectSwitchHook;",harness);
  const source=harness.generated;
  assert.ok(source.includes("activeProject()"));
  let project={id:"first"},notifications=0;
  const window={TubeBenderReferenceSceneUi:{markSceneChanged:()=>notifications++}};
  vm.runInNewContext(source+"\ntbTrackReferenceProjectSwitch();tbTrackReferenceProjectSwitch();",{
    activeProject:()=>project,window
  });
  assert.equal(notifications,0,"initial project must not signal replacement");
  // The generated code is kept in its original realm for stateful identity tracking.
  const ctx={activeProject:()=>project,window};
  vm.createContext(ctx);
  vm.runInContext(source+"\ntbTrackReferenceProjectSwitch();",ctx);
  project={id:"replacement"};
  vm.runInContext("tbTrackReferenceProjectSwitch();tbTrackReferenceProjectSwitch();",ctx);
  assert.equal(notifications,1);
});
