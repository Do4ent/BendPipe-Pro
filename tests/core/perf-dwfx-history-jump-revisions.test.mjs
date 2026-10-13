import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

function generatedHistoryJump(){
  const builder=fs.readFileSync(new URL("../../scripts/build-standalone.mjs",import.meta.url),"utf8");
  const begin=builder.indexOf("const historyPanelRuntime =");
  const end=builder.indexOf("output=output.replace(historyPanelBeginAnchor,historyPanelRuntime",begin);
  assert.ok(begin>=0&&end>begin,"history panel generator is present");
  const sandbox={};
  vm.runInNewContext(builder.slice(begin,end)+"\nthis.generated=historyPanelRuntime;",sandbox);
  const generated=sandbox.generated;
  const first=generated.indexOf("function tbHistoryJump(");
  const last=generated.indexOf("function tbHistoryEnsurePanel(",first);
  assert.ok(first>=0&&last>first);
  return generated.slice(first,last);
}

test("history timeline jump notifies DWFx only on successful snapshot restore",()=>{
  const source=generatedHistoryJump();
  for(const result of [true,false]){
    const notifications=[];
    const original={id:"project"};
    const states=[{label:"change",before:{id:"before"},after:{id:"after"}}];
    const history={undo:states.slice(),redo:[],transaction:null,applying:false};
    let restores=0,updates=0;
    const ctx={
      poReadOnly:()=>false,
      tbHistory:history,
      tbHistoryTimeline:()=>[...history.undo,...history.redo.slice().reverse()],
      tbHistoryCursor:()=>history.undo.length,
      tbHistoryRestore:()=>{restores++;return result;},
      tbHistoryUpdateUi:()=>updates++,
      ptToast:()=>{},
      activeProject:()=>original,
      window:{TubeBenderReferenceSceneUi:{markSceneChanged:(project,kind)=>notifications.push({project,kind})}}
    };
    vm.createContext(ctx);
    vm.runInContext(source+"\nthis.jump=tbHistoryJump;",ctx);
    assert.equal(ctx.jump(0),result);
    assert.equal(restores,1);
    assert.equal(notifications.length,Number(result));
    if(result){
      assert.equal(notifications[0].project,original);
      assert.equal(notifications[0].kind,"geometry");
    }
    assert.equal(updates,Number(result));
    assert.equal(history.undo.length,result?0:1);
    assert.equal(history.redo.length,result?1:0);
  }
});

test("history jump to current cursor does not re-emit geometry revision",()=>{
  const source=generatedHistoryJump();
  let restores=0,notifications=0;
  const ctx={
    poReadOnly:()=>false,
    tbHistory:{undo:[{before:{},after:{}}],redo:[],transaction:null,applying:false},
    tbHistoryTimeline:()=>[{before:{},after:{}}],
    tbHistoryCursor:()=>1,
    tbHistoryRestore:()=>{restores++;return true;},
    activeProject:()=>({}),
    window:{TubeBenderReferenceSceneUi:{markSceneChanged:()=>notifications++}}
  };
  vm.createContext(ctx);
  vm.runInContext(source+"\nthis.jump=tbHistoryJump;",ctx);
  assert.equal(ctx.jump(1),true);
  assert.equal(restores,0);
  assert.equal(notifications,0);
});
