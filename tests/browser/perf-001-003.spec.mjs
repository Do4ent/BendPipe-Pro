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
  return async()=>{
    const state=await page.evaluate(()=>({
      readyState:document.readyState,
      startup:window.TubeBenderStartupStatus??null,
      engineering:!!window.TubeBenderEngineering,
      performance:!!window.TubeBenderRenderPerformance,
      scripts:[...document.scripts].length
    })).catch(error=>({evaluationError:String(error)}));
    return JSON.stringify({state,failures:failures.slice(0,25)},null,2);
  };
}
async function expectStartup(page,predicate,timeout){
  const diagnostics=captureStartupDiagnostics(page);
  try{
    await expect.poll(()=>page.evaluate(predicate),{timeout,intervals:[200,800,2000]}).toBe(true);
  }catch(error){
    throw new Error("TubeBender startup did not complete. Browser evidence:\n"+await diagnostics()+"\n"+String(error));
  }
}


test("[PERF-003] core event binding survives isolated startup stages",async({page})=>{
  test.setTimeout(140000);
  const response=await page.goto(html,{waitUntil:"commit",timeout:15000});
  expect(response?.status()).toBe(200);
  await expectStartup(page,()=>Boolean(window.TubeBenderStartupStatus?.booted===true&&document.getElementById("projectCombo")),110000);
  const startup=await page.evaluate(()=>window.TubeBenderStartupStatus?.phases??[]);
  expect(startup.some(stage=>stage.name==="bind"&&stage.status==="ok")).toBe(true);
});

test("[PERF-001] repeated renders produce at most one 3D redraw per frame",async({page})=>{
  test.setTimeout(150000);
  const response=await page.goto(html,{waitUntil:"commit",timeout:15000});
  expect(response?.status()).toBe(200);
  await expectStartup(page,()=>Boolean(window.TubeBenderStartupStatus?.booted&&window.TubeBenderEngineering?.renderAll&&window.TubeBenderRenderPerformance),115000);
  const result=await page.evaluate(async()=>{
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
  expect(result.requests).toBe(3);
  expect(result.drawsDuring).toBe(0);
  expect(result.drawsTotal).toBeLessThanOrEqual(1);
});
