import test from "node:test";
import assert from "node:assert/strict";
import {createCooperativeSceneQueue} from "../../src/domain/performance/render-startup.mjs";
function clock(){
  let seq=0;const pending=new Map();
  return {pending,postTask(fn){const id=++seq;pending.set(id,fn);return id;},
    cancelTask(id){pending.delete(id);},
    tick(){const work=[...pending.values()];pending.clear();work.forEach(fn=>fn());}};
}
test("scene queue partitions 100 elements into nonblocking batches preserving order",()=>{
  const c=clock(),seen=[];let ended=0;
  const q=createCooperativeSceneQueue({...c,batchSize:16,
    processItem:(value,index)=>seen.push([value,index]),onComplete:()=>ended++});
  q.start(Array.from({length:100},(_,i)=>i*2));
  assert.equal(seen.length,0);
  c.tick();assert.equal(seen.length,16);
  while(q.pending)c.tick();
  assert.equal(ended,1);
  assert.deepEqual(seen,Array.from({length:100},(_,i)=>[i*2,i]));
  assert.equal(q.progress.batches,7);
});
test("superseded CAD project never continues processing stale items",()=>{
  const c=clock(),seen=[];
  const q=createCooperativeSceneQueue({...c,batchSize:2,processItem:v=>seen.push(v)});
  q.start([1,2,3,4]);c.tick();
  q.start([10,11]);c.tick();
  assert.deepEqual(seen,[1,2,10,11]);
});
test("cancel stops remaining scene batches",()=>{
  const c=clock(),seen=[];
  const q=createCooperativeSceneQueue({...c,batchSize:1,processItem:v=>seen.push(v)});
  q.start([1,2,3]);c.tick();q.cancel();c.tick();
  assert.deepEqual(seen,[1]);
});
test("individual processing errors do not abort independent scene components",()=>{
  const c=clock(),seen=[],errors=[];
  const q=createCooperativeSceneQueue({...c,batchSize:2,
    processItem:v=>{if(v===2)throw Error("bad component");seen.push(v);},
    onError:(error,i)=>errors.push([error.message,i])});
  q.start([1,2,3]);while(q.pending)c.tick();
  assert.deepEqual(seen,[1,3]);
  assert.deepEqual(errors,[["bad component",1]]);
  assert.equal(q.progress.failures,1);
});
