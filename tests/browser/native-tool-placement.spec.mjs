import {test,expect} from "@playwright/test";

test("[CAD-TOOLS] native launchers never paint outside All Panels on load or reload",async({page})=>{
  test.setTimeout(60000);
  await page.addInitScript(()=>{
    window.__floatingToolFrames=[];
    let active=true;
    window.__stopToolFrames=()=>{active=false;};
    const record=()=>{
      const ids=[...(document.body?.children??[])].filter(node=>
        (node.tagName==="BUTTON"&&node.id.startsWith("tb"))||node.id==="tbTransformGizmoPanel"
      ).filter(node=>{
        const style=getComputedStyle(node);return style.display!=="none"&&style.visibility!=="hidden";
      }).map(node=>node.id);
      if(ids.length)window.__floatingToolFrames.push(ids);
      if(active)requestAnimationFrame(record);
    };
    requestAnimationFrame(record);
  });
  for(const reload of [false,true]){
    if(reload)await page.reload({waitUntil:"load"});
    else await page.goto("/BendPipe_Pro_CAD_Workspace.html",{waitUntil:"load"});
    await expect(page.locator("#cadToolDrawer #tbNormalizeGeometryToggle")).toHaveCount(1);
    await expect(page.locator("#cadToolDrawer #tbLayersToggle")).toHaveCount(1);
    await page.locator("#cadTools").click();
    await expect(page.locator("#cadToolDrawer #tbLayersToggle")).toBeVisible();
    await page.locator("#cadToolDrawer #tbLayersToggle").click();
    await expect(page.locator("#tbLayersPanel")).toBeVisible();
    await page.locator("[data-layer-close]").click();
    expect(await page.evaluate(()=>{window.__stopToolFrames();return window.__floatingToolFrames;})).toEqual([]);
  }
});

test("[CAD-TOOLS] a delayed launcher stays hidden until placed and retains its action",async({page})=>{
  await page.goto("/BendPipe_Pro_CAD_Workspace.html",{waitUntil:"load"});
  await page.waitForFunction(()=>Boolean(window.TubeBenderCadWorkspace));
  const initialVisibility=await page.evaluate(()=>{
    window.__lateToolClicks=0;
    const button=document.createElement("button");button.id="tbLateToolProbe";
    button.textContent="Late tool probe";
    button.style.cssText="position:fixed;top:0;left:0;z-index:2147483647;visibility:visible";
    button.onclick=()=>{window.__lateToolClicks++;};
    document.body.append(button);
    return getComputedStyle(button).visibility;
  });
  expect(initialVisibility).toBe("hidden");
  await expect(page.locator("#cadToolDrawer #tbLateToolProbe")).toHaveCount(1);
  await page.locator("#cadTools").click();
  await page.locator("#tbLateToolProbe").click();
  expect(await page.evaluate(()=>window.__lateToolClicks)).toBe(1);
  await expect(page.locator("#cadToolDrawer")).toBeHidden();
});
