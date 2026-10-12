import {test,expect} from "@playwright/test";

test("[CAD-REFERENCE] approved interface is wired into real CAD workspace",async({page})=>{
  test.setTimeout(120000);
  const errors=[];page.on("pageerror",error=>errors.push(String(error)));
  const response=await page.goto("/BendPipe_Pro_CAD_Workspace.html",{waitUntil:"load"});
  expect(response.status()).toBe(200);
  await page.waitForFunction(()=>Boolean(window.TubeBenderReferenceWorkspace&&window.TubeBenderCadWorkspace));
  await expect(page.locator("#cadRibbon")).toBeVisible();
  await expect(page.locator('[data-cad-stage="geometry"]')).toHaveAttribute("aria-selected","true");
  await expect(page.locator("#cadReferenceStatus")).toBeVisible();
  await expect(page.locator("#cadReferenceInfo")).toHaveCount(1);
  await expect(page.locator("#cadReferenceTechTab")).toHaveCount(1);
  for(const action of ["radius","dimensions","display"])
    await expect(page.locator('[data-cad-ref-action="'+action+'"]')).toHaveCount(1);
  const active=await page.evaluate(()=>window.TubeBenderEngineering.activeTube()?.name??"Труба не выбрана");
  await expect(page.locator("#cadReferenceStatus")).toContainText(active);
  await expect(page.locator("#cadReferenceStatus")).toContainText("Гибов:");
  await page.locator('[data-cad-ref-action="radius"]').click();
  await page.locator("#cadReferenceTechTab").click();
  await expect(page.locator('[data-cad-stage="technology"]')).toHaveAttribute("aria-selected","true");
  await page.locator('[data-cad-stage="geometry"]').click();
  await expect(page.locator('[data-cad-ref-action="dimensions"]')).toHaveCount(1);
  await expect(page.locator("#cadPropertySlot #tbPropertiesPanel")).toHaveCount(1);
  await page.screenshot({path:"reports/browser/cad-reference-desktop.png",fullPage:true});
  await page.locator("#cadRestore").click();
  await expect(page.locator("#cadRibbon")).toBeHidden();
  await expect(page.locator("#cadReferenceStatus")).toBeHidden();
  await expect(page.locator("#cadReferenceQuick")).toBeHidden();
  await page.locator("#cadRestore").click();
  await expect(page.locator("#cadRibbon")).toBeVisible();
  expect(await page.evaluate(()=>window.TubeBenderEngineering.activeTube()?.name??"Труба не выбрана")).toBe(active);
  expect(errors).toEqual([]);
});

test("[CAD-REFERENCE] compact viewport remains usable without replacing 3D renderer",async({page})=>{
  test.setTimeout(90000);
  await page.setViewportSize({width:390,height:844});
  await page.goto("/BendPipe_Pro_CAD_Workspace.html",{waitUntil:"load"});
  await page.waitForFunction(()=>Boolean(window.TubeBenderReferenceWorkspace));
  await expect(page.locator("#cadReferenceStatus")).toHaveCount(1);
  const data=await page.evaluate(()=>({
    scrollWidth:document.documentElement.scrollWidth,windowWidth:innerWidth,
    viewerExists:!!document.querySelector(".tb-map-3d"),
    canvasExists:!!document.querySelector(".tb-map-3d canvas"),
    referenceScripts:document.querySelectorAll("[data-bendpipe-reference]").length
  }));
  expect(data.scrollWidth).toBeLessThanOrEqual(data.windowWidth+2);
  expect(data.viewerExists).toBe(true);
  expect(data.canvasExists).toBe(true);
  expect(data.referenceScripts).toBe(1);
  await page.screenshot({path:"reports/browser/cad-reference-mobile.png",fullPage:true});
});

test("[CAD-REFERENCE] unknown and unavailable commands fail visibly",async({page})=>{
  await page.goto("/BendPipe_Pro_CAD_Workspace.html",{waitUntil:"load"});
  await page.waitForFunction(()=>Boolean(window.TubeBenderReferenceWorkspace));
  const result=await page.evaluate(()=>{
    const api=window.TubeBenderReferenceWorkspace;
    const original=window.TubeBenderNamedViews;
    try{
      window.TubeBenderNamedViews=undefined;
      return {unknown:api.execute("__unknown_command__"),unavailable:api.execute("views")};
    }finally{window.TubeBenderNamedViews=original;}
  });
  expect(result).toEqual({unknown:false,unavailable:false});
});


test("[CAD-REFERENCE] status never invents length for absent or incomplete geometry",async({page})=>{
  await page.goto("/BendPipe_Pro_CAD_Workspace.html",{waitUntil:"load"});
  await page.waitForFunction(()=>Boolean(window.TubeBenderReferenceWorkspace));
  const summary=await page.evaluate(()=>window.TubeBenderReferenceWorkspace.activeSummary());
  if(!summary.tube||summary.rows.length===0){
    expect(summary.length).toBeNull();
    await expect(page.locator("#cadReferenceStatus")).toContainText("не определена");
  }
  if(summary.rows.some(row=>row.type==="LINE"&&(row.L==null||row.L===""))||
     summary.rows.some(row=>row.type==="BEND"&&(row.clr==null||row.angle==null))){
    expect(summary.length).toBeNull();
  }
  expect(summary.length===null||Number.isFinite(summary.length)).toBe(true);
});


test("[CAD-REFERENCE] missing native layers panel does not report successful command",async({page})=>{
  await page.goto("/BendPipe_Pro_CAD_Workspace.html",{waitUntil:"load"});
  await page.waitForFunction(()=>Boolean(window.TubeBenderCadWorkspace));
  const result=await page.evaluate(()=>{
    const node=document.getElementById("tbLayersPanel");
    if(!node)return {missing:true,returned:window.TubeBenderCadWorkspace.execute("layers")};
    const parent=node.parentNode,next=node.nextSibling;
    node.remove();
    try{return {missing:true,returned:window.TubeBenderCadWorkspace.execute("layers")};}
    finally{parent.insertBefore(node,next);}
  });
  expect(result).toEqual({missing:true,returned:false});
});


test("[CAD-REFERENCE] real 3D viewport, project tree, geometry inspector and workspace switching",async({page})=>{
  test.setTimeout(120000);
  const errors=[];page.on("pageerror",error=>errors.push(String(error)));
  await page.setViewportSize({width:1672,height:941});
  await page.goto("/BendPipe_Pro_CAD_Workspace.html",{waitUntil:"load"});
  await page.waitForFunction(()=>Boolean(window.TubeBenderEngineering&&window.TubeBenderReferenceWorkspace));
  await expect(page.locator(".tb-map-3d canvas")).toBeVisible();
  await expect(page.locator(".tb-tree-card")).toBeVisible();
  await expect(page.locator("#cadPropertySlot #tbPropertiesPanel")).toHaveCount(1);
  const state=await page.evaluate(()=>({
    canvas:!!document.querySelector(".tb-map-3d canvas"),
    webgl:!!document.getElementById("threeCanvas")?.getContext("webgl2"),
    project:!!window.TubeBenderEngineering.activeProject?.(),
    tube:!!window.TubeBenderEngineering.activeTube?.()
  }));
  expect(state.canvas).toBe(true);
  expect(state.webgl).toBe(true);
  expect(state.project).toBe(true);
  const canvas=page.locator(".tb-map-3d canvas").first();
  const rect=await canvas.boundingBox();expect(rect?.width).toBeGreaterThan(100);
  if(rect){
    await page.mouse.move(rect.x+rect.width/2,rect.y+rect.height/2);
    await page.mouse.down({button:"left"});
    await page.mouse.move(rect.x+rect.width/2+45,rect.y+rect.height/2+25,{steps:5});
    await page.mouse.up({button:"left"});
  }
  for(const stage of ["source","geometry","technology","machine","release"]){
    await page.locator('[data-cad-stage="'+stage+'"]').click();
    await expect(page.locator('[data-cad-stage="'+stage+'"]')).toHaveAttribute("aria-selected","true");
  }
  await page.locator('[data-cad-stage="geometry"]').click();
  await page.locator('[data-inspector-tab="properties"]').click();
  await expect(page.locator("#cadPropertySlot")).toBeVisible();
  expect(errors).toEqual([]);
});
