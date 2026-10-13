import test from "node:test";
import assert from "node:assert/strict";
import {scheduleInitialSceneAfterPaint} from "../../src/domain/performance/render-startup.mjs";

function clock(){
  let next=0;const frames=new Map(),tasks=new Map();
  return {
    frames,tasks,
    requestFrame(fn){const id=++next;frames.set(id,fn);return id;},
    cancelFrame(id){frames.delete(id);},
    postTask(fn){const id=++next;tasks.set(id,fn);return id;},
    cancelTask(id){tasks.delete(id);},
    frame(){const work=[...frames.values()];frames.clear();work.forEach(fn=>fn());},
    runTasks(){const work=[...tasks.values()];tasks.clear();work.forEach(fn=>fn());}
  };
}
test("initial scene is deferred past two animation frames and a task boundary",()=>{
  const c=clock();let draws=0;
  scheduleInitialSceneAfterPaint({...c,draw:()=>draws++});
  assert.equal(draws,0);
  c.frame();assert.equal(draws,0);
  c.frame();assert.equal(draws,0);
  assert.equal(c.tasks.size,1);
  c.runTasks();assert.equal(draws,1);
});
test("cancelled initial scene does not build stale geometry",()=>{
  const c=clock();let draws=0;
  const cancel=scheduleInitialSceneAfterPaint({...c,draw:()=>draws++});
  c.frame();c.frame();cancel();c.runTasks();
  assert.equal(draws,0);
});
test("standalone builder integrates post-paint rendering",async()=>{
  const fs=await import("node:fs");
  const source=fs.readFileSync(new URL("../../scripts/build-standalone.mjs",import.meta.url),"utf8");
  assert.match(source,/tbScheduleInitialSceneAfterPaint/);
  assert.match(source,/status\.cancelInitialScene/);
});
