import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

test("history timeline jump marks DWFx geometry changed only after successful restore",()=>{
  const builder=fs.readFileSync(new URL("../../scripts/build-standalone.mjs",import.meta.url),"utf8");
  const begin=builder.indexOf("const historyPanelRuntime =");
  const end=builder.indexOf("output=output.replace(historyPanelBeginAnchor,historyPanelRuntime",begin);
  assert.ok(begin>=0&&end>begin,"history panel generator is present");
  const sandbox={};
  vm.runInNewContext(builder.slice(begin,end)+"\nthis.generated=historyPanelRuntime;",sandbox);
  const generated=sandbox.generated;
  const restore=generated.indexOf("if(!tbHistoryRestore(snapshot))return false;");
  const change=generated.indexOf("markSceneChanged?.(activeProject(),'geometry')");
  const timelineUpdate=generated.indexOf("tbHistory.undo.splice",restore);
  assert.ok(restore>=0,"restoration guard is present");
  assert.ok(change>restore,"revision changes after successful restoration");
  assert.ok(timelineUpdate>change,"revision changes before timeline update");
});
