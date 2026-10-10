import {test,expect} from "@playwright/test";

const html="/TubeBender_CAD_VC207R7_M1_Standalone.html";
const samples=5;

test("[PERF-001] Chromium measures real 3D redraw request-to-completion latency",async({page},testInfo)=>{
  test.setTimeout(180000);
  const response=await page.goto(html,{waitUntil:"commit",timeout:15000});
  expect(response?.status()).toBe(200);
  await expect.poll(()=>page.evaluate(()=>Boolean(
    window.TubeBenderStartupStatus?.booted &&
    window.TubeBenderEngineering?.renderAll &&
    window.TubeBenderRenderPerformance?.stats
  )),{timeout:115000,intervals:[250,1000,2000]}).toBe(true);

  const measurements=[];
  for(let index=0;index<samples;index++){
    const started=await page.evaluate(()=>{
      const perf=window.TubeBenderRenderPerformance;
      const previous=perf.stats;
      const start=performance.now();
      window.TubeBenderEngineering.renderAll();
      return {start,request:previous.requests,draw:previous.draws,failure:previous.failures};
    });
    await expect.poll(()=>page.evaluate(
      ({draw,failure})=>{
        const stats=window.TubeBenderRenderPerformance.stats;
        return stats.draws>draw || stats.failures>failure;
      },started
    ),{timeout:30000,intervals:[16,33,100]}).toBe(true);
    const result=await page.evaluate(({start,request,draw,failure})=>{
      const stats=window.TubeBenderRenderPerformance.stats;
      return {
        elapsedMs:performance.now()-start,
        redrawRequests:stats.requests-request,
        completedDraws:stats.draws-draw,
        failedDraws:stats.failures-failure,
        rendererMs:stats.lastRenderMs,
        frameQueueMs:stats.lastWaitMs
      };
    },started);
    measurements.push(result);
    expect(result.failedDraws).toBe(0);
    expect(result.redrawRequests).toBeGreaterThanOrEqual(1);
    expect(result.completedDraws).toBeGreaterThanOrEqual(1);
    expect(Number.isFinite(result.elapsedMs)).toBe(true);
  }
  const ordered=measurements.map(sample=>sample.elapsedMs).sort((a,b)=>a-b);
  const summary={
    requirement:"PERF-001",
    metric:"renderAll request until observed renderer completion via Playwright polling",
    limitation:"Includes Playwright polling overhead; not parameter-edit-to-photon latency",
    samples:measurements,
    medianMs:ordered[Math.floor(ordered.length/2)],
    maxMs:ordered[ordered.length-1],
    browser:testInfo.project.name
  };
  await testInfo.attach("perf-001-redraw-measurements.json",{
    body:JSON.stringify(summary,null,2),contentType:"application/json"
  });
  console.log("PERF-001 redraw measurements:",JSON.stringify(summary));
});
