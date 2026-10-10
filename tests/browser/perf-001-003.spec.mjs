import {test,expect} from "@playwright/test";
const html="/TubeBender_CAD_VC207R7_M1_Standalone.html";

test("[PERF-003] core event binding survives isolated startup stages",async({page})=>{
  test.setTimeout(140000);
  const response=await page.goto(html,{waitUntil:"commit",timeout:15000});
  expect(response?.status()).toBe(200);
  await expect.poll(async()=>page.evaluate(()=>({
    booted:window.TubeBenderStartupStatus?.booted===true,
    phases:window.TubeBenderStartupStatus?.phases??[],
    commandButton:!!document.getElementById("projectCombo")
  })),{timeout:110000,intervals:[200,800,2000]})
    .toEqual(expect.objectContaining({booted:true,commandButton:true}));
  const startup=await page.evaluate(()=>window.TubeBenderStartupStatus?.phases??[]);
  expect(startup.some(stage=>stage.name==="bind"&&stage.status==="ok")).toBe(true);
});

test("[PERF-001] repeated renders produce at most one 3D redraw per frame",async({page})=>{
  test.setTimeout(150000);
  const response=await page.goto(html,{waitUntil:"commit",timeout:15000});
  expect(response?.status()).toBe(200);
  await expect.poll(async()=>page.evaluate(()=>Boolean(window.TubeBenderStartupStatus?.booted&&
    window.TubeBenderEngineering?.renderAll&&window.TubeBenderRenderPerformance)),{
    timeout:115000,intervals:[200,800,2000]}).toBe(true);
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

test("[PERF-003] injected optional view picker failure preserves core binding",async({page})=>{
  test.setTimeout(150000);
  const warnings=[];
  page.on("console",message=>{
    if(message.type()==="warning" && message.text().includes("Optional picker initialization"))
      warnings.push(message.text());
  });
  await page.addInitScript(()=>{
    window.__TB_TEST_PERF003_FAIL_OPTIONAL__=true;
  });
  const response=await page.goto(html,{waitUntil:"commit",timeout:15000});
  expect(response?.status()).toBe(200);
  await expect.poll(()=>page.evaluate(()=>Boolean(
    window.TubeBenderStartupStatus?.booted &&
    window.TubeBenderStartupStatus.phases.some(phase=>phase.name==="bind"&&phase.status==="ok")
  )),{timeout:115000,intervals:[200,800,2000]}).toBe(true);
  await expect.poll(()=>warnings.some(text=>text.includes("buildViewPicker")),{
    timeout:30000,intervals:[100,500]
  }).toBe(true);
  const controls=await page.evaluate(()=>({
    projectCombo:!!document.getElementById("projectCombo"),
    renderAll:typeof window.TubeBenderEngineering?.renderAll==="function",
    phases:window.TubeBenderStartupStatus.phases.map(({name,status})=>({name,status}))
  }));
  expect(controls.projectCombo).toBe(true);
  expect(controls.renderAll).toBe(true);
  expect(controls.phases.find(phase=>phase.name==="bind")?.status).toBe("ok");
});
