import {test,expect} from "@playwright/test";
import {REQUIREMENT_IDS,BROWSER_COVERAGE} from "../../acceptance/requirements-120.mjs";
const html="/TubeBender_CAD_VC207R7_M1_Standalone.html";
test.beforeEach(async({page})=>{
  await page.goto(html,{waitUntil:"domcontentloaded"});
  await expect(page.locator("#app")).toBeVisible();
});
test("[UI-006] visible top-bar project, tube and main actions (partial)",async({page})=>{
  for(const selector of ["#projectCombo","#tubeCombo","#projectOpenQuick","#openSettings"]){
    await expect(page.locator(selector)).toBeVisible();
  }
});
test("[UI-009] desktop viewport has no global page scrollbar",async({page})=>{
  await page.setViewportSize({width:1672,height:941});
  await expect.poll(async()=>page.evaluate(()=>({
    x:document.documentElement.scrollWidth<=document.documentElement.clientWidth+1,
    y:document.documentElement.scrollHeight<=document.documentElement.clientHeight+1
  }))).toEqual({x:true,y:true});
});
test("[VIEW-006] standalone canvas and bundled renderer presence (partial)",async({page})=>{
  await expect(page.locator("canvas#threeCanvas")).toBeVisible();
  const result=await page.evaluate(()=>({
    three:typeof window.THREE==="object",
    cdn:[...document.querySelectorAll("script[src]")].filter(e=>/^https?:/i.test(e.src)).length
  }));
  expect(result.three).toBeTruthy();
  expect(result.cdn).toBe(0);
});
test("[I18N-001] all four language choices are offered (partial)",async({page})=>{
  await page.locator("#openSettings").click();
  await page.locator("#settingsTabLanguage").click();
  await expect(page.locator("#settingsPaneLanguage")).toBeVisible();
  await expect.poll(async()=>page.locator("#langList").locator("button,[role=option]").count()).toBeGreaterThanOrEqual(4);
});
test("[I18N-002] language selection lives on Settings language tab",async({page})=>{
  await page.locator("#openSettings").click();
  await expect(page.locator("#settingsTabLanguage")).toBeVisible();
  await page.locator("#settingsTabLanguage").click();
  await expect(page.locator("#settingsTabLanguage")).toHaveAttribute("aria-selected","true");
  await expect(page.locator("#settingsPaneLanguage")).toBeVisible();
  await expect(page.locator("#langSearch")).toBeVisible();
});
test("[PERF-005] no duplicate DOM IDs across a settings redraw (partial)",async({page})=>{
  const duplicated=()=>page.evaluate(()=>{
    const all=[...document.querySelectorAll("[id]")].map(e=>e.id);
    return [...new Set(all.filter((v,i)=>all.indexOf(v)!==i))].slice(0,20);
  });
  expect(await duplicated()).toEqual([]);
  await page.locator("#openSettings").click();
  await page.locator("#settingsTabLanguage").click();
  expect(await duplicated()).toEqual([]);
});
test("[MOB-001] mobile viewport has no global document scrollbars",async({page})=>{
  await page.setViewportSize({width:390,height:844});
  await expect.poll(async()=>page.evaluate(()=>({
    x:document.documentElement.scrollWidth<=document.documentElement.clientWidth+1,
    y:document.documentElement.scrollHeight<=document.documentElement.clientHeight+1
  }))).toEqual({x:true,y:true});
});
// Traceability guard: unknown IDs or untracked browser scenarios are failures,
// but the remaining requirements are NOT silently marked as passed.
test("coverage manifest includes exactly the functional 120",()=>{
  expect(REQUIREMENT_IDS).toHaveLength(120);
  expect(new Set(REQUIREMENT_IDS).size).toBe(120);
  for(const id of Object.keys(BROWSER_COVERAGE))expect(REQUIREMENT_IDS).toContain(id);
});
