import {test,expect} from "@playwright/test";
const html="/TubeBender_CAD_VC207R7_M1_Standalone.html";

// Keep CI failure messages actionable even when the initial bundle never boots.
function captureStartupDiagnostics(page){
  const failures=[];
  page.on("pageerror",error=>failures.push("pageerror: "+String(error?.stack||error)));
  page.on("console",message=>{
    if(message.type()==="error")failures.push("console: "+message.text());
  });
  page.on("requestfailed",request=>failures.push("requestfailed: "+request.url()+" "+(request.failure()?.errorText||"")));
  const diagnostics=async()=>{
    // A blocked Chromium main thread must not hide the original startup timeout.
    const evaluation=page.evaluate(()=>({
      readyState:document.readyState,
      startup:window.TubeBenderStartupStatus??null,
      engineering:!!window.TubeBenderEngineering,
      performance:!!window.TubeBenderRenderPerformance,
      scripts:[...document.scripts].length
    })).catch(error=>({evaluationError:String(error)}));
    let timer;
    const state=await Promise.race([
      evaluation,
      new Promise(resolve=>{timer=setTimeout(()=>resolve({evaluationTimeoutMs:3000}),3000);})
    ]).finally(()=>clearTimeout(timer));
    return JSON.stringify({state,failures:failures.slice(0,25)},null,2);
  };
  // A known startup failure should not consume the entire browser test timeout.
  diagnostics.fatalFailure=()=>failures.find(message=>
    message.startsWith("pageerror:")||message.includes("startup bind toolbar commands failed")
  )??null;
  return diagnostics;
}
async function expectStartup(page,predicate,timeout,diagnostics){
  const started=Date.now();
  let lastError=null;
  try{
    while(Date.now()-started<timeout){
      const fatal=diagnostics.fatalFailure();
      if(fatal)throw new Error("Fatal startup error: "+fatal);
      // Avoid an unlimited accumulation of Playwright evaluate calls when
      // Chromium's main thread is blocked by a synchronous startup phase.
      let timer;
      const outcome=await Promise.race([
        page.evaluate(predicate).then(value=>({value}),error=>({error:String(error)})),
        new Promise(resolve=>{timer=setTimeout(()=>resolve({stalled:true}),3000);})
      ]).finally(()=>clearTimeout(timer));
      if(outcome.value===true)return;
      if(outcome.error)lastError=outcome.error;
      if(outcome.stalled)throw new Error("Chromium main thread did not answer startup probe within 3000 ms");
      await new Promise(resolve=>setTimeout(resolve,250));
    }
    throw new Error("Startup predicate was not satisfied within "+timeout+" ms"+(lastError?"; last browser error: "+lastError:""));
  }catch(error){
    throw new Error("TubeBender startup did not complete. Browser evidence:\n"+await diagnostics()+"\n"+String(error));
  }
}


test("[PERF-003] core event binding survives isolated startup stages",async({page})=>{
  test.setTimeout(140000);
  const diagnostics=captureStartupDiagnostics(page);
  const response=await page.goto(html,{waitUntil:"commit",timeout:15000});
  expect(response?.status()).toBe(200);
  await expectStartup(page,()=>Boolean(window.TubeBenderStartupStatus?.booted===true&&document.getElementById("projectCombo")),110000,diagnostics);
  await expectStartup(page,()=>Boolean(window.TubeBenderStartupStatus?.phases?.some(
    stage=>stage.name==="bind"&&stage.status==="ok"
  )),10000,diagnostics);
});

test("[PERF-001] repeated renders produce at most one 3D redraw per frame",async({page})=>{
  test.setTimeout(150000);
  const diagnostics=captureStartupDiagnostics(page);
  const response=await page.goto(html,{waitUntil:"commit",timeout:15000});
  expect(response?.status()).toBe(200);
  await expectStartup(page,()=>Boolean(window.TubeBenderStartupStatus?.booted&&window.TubeBenderEngineering?.renderAll&&window.TubeBenderRenderPerformance),115000,diagnostics);
  const measurement=page.evaluate(async()=>{
    // A real model update, no mocked render implementation.
    const perf=window.TubeBenderRenderPerformance;
    const before=perf.stats;
    for(let n=0;n<3;n++)window.TubeBenderEngineering.renderAll();
    const during=perf.stats;
    await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
    const after=perf.stats;
    return {requests:during.requests-before.requests,drawsDuring:during.draws-before.draws,
      drawsTotal:after.draws-before.draws};
  });
  let measurementTimer;
  const result=await Promise.race([
    measurement,
    new Promise((_,reject)=>{
      measurementTimer=setTimeout(()=>reject(new Error("PERF-001 redraw measurement timed out. Browser evidence:\\n"+diagnostics.fatalFailure())),10000);
    })
  ]).finally(()=>clearTimeout(measurementTimer));
  expect(result.requests).toBe(3);
  expect(result.drawsDuring).toBe(0);
  expect(result.drawsTotal).toBeLessThanOrEqual(1);
});
