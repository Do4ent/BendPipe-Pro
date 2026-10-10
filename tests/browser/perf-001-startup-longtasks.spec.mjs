import {test,expect} from "@playwright/test";

const html="/TubeBender_CAD_VC207R7_M1_Standalone.html";

// PERF-001 diagnostics: collect Chromium startup main-thread long tasks.
// Representative DWFx edit-to-paint thresholds require a real CAD fixture.
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

  // Console events arrive out-of-process and remain available if the page's
  // main thread becomes unresponsive to evaluate().
  const consoleEvidence=[];
  page.on("console",msg=>{
    if(consoleEvidence.length<200)
      consoleEvidence.push({type:msg.type(),text:msg.text().slice(0,500)});
  });
  page.on("pageerror",error=>{
    if(consoleEvidence.length<200)
      consoleEvidence.push({type:"pageerror",text:String(error).slice(0,500)});
  });

  let navigationError=null;
  try{
    const response=await page.goto(html,{waitUntil:"commit",timeout:15000});
    expect(response?.status()).toBe(200);
    await expect.poll(()=>page.evaluate(()=>
      window.TubeBenderStartupStatus?.booted===true
    ),{timeout:115000,intervals:[250,1000,2000]}).toBe(true);
  }catch(error){
    navigationError=String(error);
  }

  let pageEvidence={unavailable:true};
  let evidenceTimeout=null;
  try{
    pageEvidence=await Promise.race([
      page.evaluate(()=>({
        booted:window.TubeBenderStartupStatus?.booted===true,
        startupPhases:window.TubeBenderStartupStatus?.phases?.map(
          ({name,status})=>({name,status})
        )??[],
        longTasks:window.__TB_PERF_STARTUP_LONGTASKS__??[],
        observerError:window.__TB_PERF_STARTUP_OBSERVER_ERROR__??null,
        elapsedSinceNavigationMs:performance.now()
      })),
      new Promise((_,reject)=>{
        evidenceTimeout=setTimeout(
          ()=>reject(new Error("PERF-001 page evidence request exceeded 5000ms")),
          5000
        );
      })
    ]);
  }catch(error){
    pageEvidence={unavailable:true,error:String(error)};
  }finally{
    if(evidenceTimeout!==null)clearTimeout(evidenceTimeout);
  }

  const durations=(pageEvidence.longTasks??[]).map(task=>task.duration);
  const evidence={
    requirement:"PERF-001",
    browser:testInfo.project.name,
    navigationError,
    pageEvidence,
    consoleEvidence,
    longTaskCount:durations.length,
    maxLongTaskMs:durations.length?Math.max(...durations):null,
    totalLongTaskMs:durations.reduce((sum,duration)=>sum+duration,0),
    note:"Diagnostic only. Long Tasks measure main-thread work >=50ms, not edit-to-paint latency."
  };
  await testInfo.attach("perf-001-startup-longtasks.json",{
    body:JSON.stringify(evidence,null,2),contentType:"application/json"
  });
  console.log("PERF-001 startup long-task diagnostics",JSON.stringify({
    booted:pageEvidence.booted,
    longTaskCount:evidence.longTaskCount,
    maxLongTaskMs:evidence.maxLongTaskMs,
    navigationError
  }));
  expect(navigationError,"Startup failed; see attached long-task evidence").toBeNull();
  expect(pageEvidence.booted).toBe(true);
});
