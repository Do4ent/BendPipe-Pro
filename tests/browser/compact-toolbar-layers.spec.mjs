import {test,expect} from "@playwright/test";

async function openWorkspace(page){
  await page.goto("/BendPipe_Pro_CAD_Workspace.html",{waitUntil:"load"});
  await page.waitForFunction(()=>Boolean(window.TubeBenderCadWorkspace&&window.TubeBenderLayers&&window.TubeBenderCommandLine));
}

test("[CAD-COMPACT] context menu reduces toolbar height and preserves separate panel preferences",async({page})=>{
  await openWorkspace(page);
  const ribbon=page.locator("#cadRibbon"),viewport=page.locator(".tb-map-3d");
  const before={ribbon:await ribbon.boundingBox(),viewport:await viewport.boundingBox()};
  await page.locator('[data-cad-command="measure"]').focus();
  await page.keyboard.press("Shift+F10");
  await page.keyboard.press("End");
  await expect(page.locator('[data-display-mode="compact"]')).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.locator("#cadCommands")).toHaveAttribute("data-cad-display","compact");
  await expect.poll(async()=> (await ribbon.boundingBox()).height).toBeLessThan(before.ribbon.height-30);
  expect((await viewport.boundingBox()).height).toBeGreaterThan(before.viewport.height+30);
  await expect(page.locator('[data-cad-command="measure"] .cad-command-label')).toBeVisible();
  const compactHeight=(await ribbon.boundingBox()).height;
  await page.locator("#tbActionSave").click({button:"right"});
  await page.locator('[data-display-mode="compact"]').click();
  await expect(page.locator(".tb-head-actions")).toHaveAttribute("data-cad-display","compact");
  expect((await ribbon.boundingBox()).height).toBe(compactHeight);
  await page.screenshot({path:"reports/browser/compact-toolbar-desktop.png",fullPage:true});
  await page.reload({waitUntil:"load"});
  await expect(page.locator("#cadCommands")).toHaveAttribute("data-cad-display","compact");
  await expect(page.locator(".tb-head-actions")).toHaveAttribute("data-cad-display","compact");
  await page.locator("#cadRestore").click();
  await expect(ribbon).toBeHidden();
  await page.locator("#cadRestore").click();
  expect((await ribbon.boundingBox()).height).toBe(compactHeight);
  await page.setViewportSize({width:390,height:844});
  await page.evaluate(()=>window.TubeBenderProperties.open());
  const drawer=await page.locator(".tb-map-right").boundingBox();
  const footer=await page.locator(".tb-map-bottom").boundingBox();
  expect(drawer.y+drawer.height).toBeLessThanOrEqual(footer.y);
  await page.locator('.tb-bottom-tab[data-tab="3d"]').click();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});

test("[CAD-LAYERS] LAYER aliases open native manager and layer edits persist without altering geometry",async({page})=>{
  test.setTimeout(90000);
  await openWorkspace(page);
  for(const alias of ["LAYER","LA","СЛОИ"]){
    await page.locator("#cadSearch").click();
    await page.locator("[data-command-input]").fill(alias);
    await page.locator("[data-command-input]").press("Enter");
    await expect(page.getByRole("dialog",{name:"Диспетчер свойств слоёв"})).toBeVisible();
    await page.locator("[data-layer-close]").click();
  }
  await page.locator('[data-cad-command="layers"]').click();
  const snapshot=await page.evaluate(()=>{
    const tube=window.TubeBenderEngineering.activeTube();
    return {id:tube.id,geometry:JSON.stringify({rows:tube.rows,evidence:tube.importEvidence,validation:tube.importValidation})};
  });
  await page.locator(`#tbProjectTree [data-tree-tube="${snapshot.id}"]`).first().click();
  await page.locator("[data-layer-new-name]").fill("Монтаж");
  await page.locator("[data-layer-new]").click();
  const layerId=await page.evaluate(()=>window.TubeBenderLayers.layers().find(layer=>layer.name==="Монтаж").id);
  await page.locator("[data-active-layer]").selectOption(layerId);
  await page.locator("[data-layer-assign]").click();
  await page.locator(`[data-layer-color="${layerId}"]`).fill("#123456");
  await page.locator(`[data-layer-color="${layerId}"]`).dispatchEvent("change");
  await page.locator(`[data-layer-locked="${layerId}"]`).check();
  const permission=await page.evaluate(()=>window.TubeBenderLayers.permissionForSelection("move"));
  expect(permission.allowed).toBe(false);
  expect(permission.code).toBe("LAYER_LOCKED");
  await page.locator(`[data-layer-locked="${layerId}"]`).uncheck();
  await page.locator(`[data-layer-visible="${layerId}"]`).uncheck();
  expect(await page.evaluate(tubeId=>window.TubeBenderLayers.entryVisibility({kind:"tube",tubeId}).visible,snapshot.id)).toBe(false);
  await page.locator(`[data-layer-visible="${layerId}"]`).check();
  await page.locator(`[data-layer-frozen="${layerId}"]`).check();
  expect(await page.evaluate(tubeId=>window.TubeBenderLayers.permissionForEntry({kind:"tube",tubeId},"move").code,snapshot.id)).toBe("LAYER_FROZEN");
  await page.locator(`[data-layer-frozen="${layerId}"]`).uncheck();
  await page.reload({waitUntil:"load"});
  await page.waitForFunction(()=>Boolean(window.TubeBenderLayers));
  const restored=await page.evaluate(({id,layerId})=>{
    const tube=window.TubeBenderEngineering.activeProject().tubes.find(tube=>tube.id===id);
    return {layerId:tube.layer_id,layer:window.TubeBenderLayers.layerById(layerId),
      geometry:JSON.stringify({rows:tube.rows,evidence:tube.importEvidence,validation:tube.importValidation})};
  },{id:snapshot.id,layerId});
  expect(restored.layerId).toBe(layerId);
  expect(restored.layer.name).toBe("Монтаж");
  expect(restored.layer.color).toBe("#123456");
  expect(restored.geometry).toBe(snapshot.geometry);
});
