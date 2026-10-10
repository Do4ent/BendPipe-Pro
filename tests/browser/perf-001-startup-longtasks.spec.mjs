import {test,expect} from "@playwright/test";

const html="/TubeBender_CAD_VC207R7_M1_Standalone.html";

// PERF-001 instrumentation: capture startup main-thread stalls independently
// of the normal page-side app diagnostics. No arbitrary latency threshold is
// asserted without a documented representative CAD reference project.
test("[PERF-001] collect Chromium startup long-task evidence",async({page},testInfo)=>{
  test.setTimeout(160000);
  await page.addInitScript(()=>{
    window.__TB_PERF_STARTUP_LONGTASKS__=[];
    window.__TB_PERF_STARTUP_OBSERVER_ERROR__=null;
    try{
      const observer=new PerformanceObserver(list=>{
        for(const task of list.getEntries()){
          window.__TB_PERF_STARTUP_LONGTASKS__.push({
            startTime:task.startTime,duration:task.duration,
            name:task.name,entryType:task.entryType
          });
        }
      });
      observer.observe({type:"longtask",buffered:true});
    }catch(error){
      window.__TB_PERF_STARTUP_OBSERVER_ERROR__=String(error);
    }
  });
  let navigationError=null;
  try{
    const response=await page.goto(html,{waitUntil:"commit",timeout:15000});
    expect(response?.status()).toBe(200);
    await expect.poll(()=>page.evaluate(()=>
      window.TubeBenderStartupStatus?.booted===true
    ),{timeout:115000,intervals:[250,1000,2000]}).toBe(true);
  }catch(error){navigationError=String(error);}

  let pageEvidence={unavailable:true};
  try{
    pageEvidence=await page.evaluate(()=>({
      booted:window.TubeBenderStartupStatus?.booted===true,
      startupPhases:window.TubeBenderStartupStatus?.phases?.map(({name,status})=>({name,status}))??[],
      longTasks:window.__TB_PERF_STARTUP_LONGTASKS__??[],
      observerError:window.__TB_PERF_STARTUP_OBSERVER_ERROR__??null,
      elapsedSinceNavigationMs:performance.now()
    }));
  }catch(error){pageEvidence={unavailable:true,error:String(error)};}
  const durations=(pageEvidence.longTasks??[]).map(t=>t.duration);
  const evidence={
    requirement:"PERF-001",
    browser:testInfo.project.name,
    navigationError,
    pageEvidence,
    longTaskCount:durations.length,
    maxLongTaskMs:durations.length?Math.max(...durations):null,
    totalLongTaskMs:durations.reduce((sum,duration)=>sum+duration,0),
    note:"Diagnostic only. Long Tasks indicate main-thread work >=50ms; they do not measure edit-to-paint latency."
  };
  await testInfo.attach("perf-001-startup-longtasks.json",{
    body:JSON.stringify(evidence,null,2),contentType:"application/json"
  });
  console.log("PERF-001 startup long task diagnostics",JSON.stringify({
    booted:pageEvidence.booted,
    longTaskCount:evidence.longTaskCount,
    maxLongTaskMs:evidence.maxLongTaskMs,
    navigationError
  }));
  expect(navigationError,"Startup failed; see attached long-task evidence").toBeNull();
  expect(pageEvidence.booted).toBe(true);
});
