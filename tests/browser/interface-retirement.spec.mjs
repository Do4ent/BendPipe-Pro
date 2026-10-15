import {test,expect} from "@playwright/test";

test("[CAD-RETIREMENT] current shell owns view tools and unfold after load and reload",async({page})=>{
  const errors=[];page.on("pageerror",error=>errors.push(error.message));
  for(const reload of [false,true]){
    if(reload)await page.reload();
    else await page.goto("/BendPipe_Pro_CAD_Workspace.html");
    await page.waitForFunction(()=>Boolean(window.TubeBenderCadWorkspace));
    await expect(page.locator("#inventorChrome,#workbench,#tbLegacyWorkbenchHost,#tbEditSummary,#routeStrip,#tbWindowControls,#tbTreeUp,#tbTreeDown,.tb-snap-toggle,#openSettings,#openEngineeringCenter")).toHaveCount(0);
    expect(await page.evaluate(()=>typeof window.TubeBenderApprovedMockup)).toBe("undefined");
    await expect(page.locator("#cadViewportControls .hud")).toHaveCount(3);
    await expect(page.locator(".tb-head-actions>button:not(.tb-head-action)")).toHaveCount(0);
    await expect(page.locator("#cadToolDrawer #tbMeasurementsButton,#cadToolDrawer #tbEditingButton")).toHaveCount(2);
    await page.locator("#viewPickerBtn").click();
    await expect(page.locator("#viewMenu")).toBeVisible();
    await page.keyboard.press("Escape");
    // View selection and the drawing share the real project, without a hidden workbench.
    await page.locator('[data-tab="unfold"]').click();
    await expect(page.locator("#cadUnfoldPanel")).toBeVisible();
    await expect(page.locator("#resultSvg > *").first()).toBeAttached();
    await expect(page.locator("#viewer")).toBeHidden();
    await page.locator('[data-cad-stage="technology"]').click();
    await expect(page.locator("#cadUnfoldPanel")).toBeHidden();
    await expect(page.locator("#viewer")).toBeVisible();
    await page.locator('[data-cad-stage="geometry"]').click();
    await page.locator('[data-tab="unfold"]').click();
    await page.locator('[data-cad-command="properties"]').click();
    await expect(page.locator("#viewer")).toBeVisible();
    await expect(page.locator("#cadUnfoldPanel")).toBeHidden();
    await page.locator("#tbActionSettings").click();
    await expect(page.locator("#settingsModal")).toBeVisible();
    await page.keyboard.press("Escape");
  }
  expect(errors).toEqual([]);
});

test("[CAD-RETIREMENT] live dimension editor commits and reopens without old UI dependencies",async({page})=>{
  const errors=[];page.on("pageerror",error=>errors.push(error.message));
  await page.goto("/BendPipe_Pro_CAD_Workspace.html");
  await page.waitForFunction(()=>Boolean(window.TubeBenderStartupStatus?.booted&&window.TubeBenderCadWorkspace));
  const target=await page.evaluate(()=>{
    const rows=window.TubeBenderEngineering.getState().rows;
    const index=rows.findIndex(row=>row.type==="LINE");
    if(index<0||!Number.isFinite(Number(rows[index].L)))throw Error("No editable straight segment");
    return {index,length:Number(rows[index].L)};
  });
  await page.evaluate(index=>openFloatingEditor(index,500,400,false),target.index);
  await page.locator("#edL").fill(String(target.length+1));
  await expect.poll(()=>page.evaluate(index=>Number(window.TubeBenderEngineering.getState().rows[index].L),target.index)).toBe(target.length+1);
  await page.locator("#edL").press("Enter");
  await expect(page.locator("#editor")).toBeHidden();
  await page.reload();
  await page.waitForFunction(()=>Boolean(window.TubeBenderStartupStatus?.booted&&window.TubeBenderCadWorkspace));
  expect(await page.evaluate(index=>Number(window.TubeBenderEngineering.getState().rows[index].L),target.index)).toBe(target.length+1);
  expect(errors).toEqual([]);
});
