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
  await expect(page.locator("#cadRestore,#tbChecksPanel,#tbTechnologyInfo,#tbLayersButton")).toHaveCount(0);
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
  const results=await page.evaluate(()=>{
    const original=window.TubeBenderEngineering;
    const cases=[null,{rows:[]},...[null,undefined,""," ",false,[],{},-1,Infinity].map(L=>({rows:[{type:"LINE",L}]})),
      {rows:[{type:"BEND",clr:null,angle:90}]},{rows:[{type:"BEND",clr:50,angle:false}]},
      {rows:[null]},{rows:[{type:"UNKNOWN"}]}];
    try{
      return cases.map(tube=>{
        window.TubeBenderEngineering={...original,activeTube:()=>tube};
        const summary=window.TubeBenderReferenceWorkspace.activeSummary();
        window.TubeBenderReferenceWorkspace.refresh();
        return {length:summary.length,evidence:summary.lengthEvidence,
          status:document.querySelector("#cadReferenceStatus").textContent};
      });
    }finally{window.TubeBenderEngineering=original;window.TubeBenderReferenceWorkspace.refresh();}
  });
  for(const result of results){
    expect(result.length).toBeNull();
    expect(result.evidence.value).toBeNull();
    expect(result.evidence.confidence).toBe(0);
    expect(result.evidence.reason).toBeTruthy();
    expect(result.evidence.source.layer).toBe("editable_tube_rows");
    expect(result.status).toContain("не определена");
  }
  const valid=await page.evaluate(()=>{
    const original=window.TubeBenderEngineering;
    try{
      window.TubeBenderEngineering={...original,activeTube:()=>({id:"explicit-edit",rows:[
        {type:"LINE",L:100},{type:"BEND",clr:50,angle:90},{type:"LINE",L:"25"}]})};
      return window.TubeBenderReferenceWorkspace.activeSummary();
    }finally{window.TubeBenderEngineering=original;}
  });
  expect(valid.length).toBeCloseTo(125+25*Math.PI,8);
  expect(valid.lengthEvidence.source).toEqual({tube_id:"explicit-edit",layer:"editable_tube_rows"});
  expect(valid.lengthEvidence.method).toBe("editable_centerline_sum");
});

test("[CAD-REFERENCE] missing methods and delegated rejection cannot report success",async({page})=>{
  await page.goto("/BendPipe_Pro_CAD_Workspace.html",{waitUntil:"load"});
  await page.waitForFunction(()=>Boolean(window.TubeBenderReferenceWorkspace));
  const result=await page.evaluate(()=>{
    const views=window.TubeBenderNamedViews,workspace=window.TubeBenderCadWorkspace;
    try{
      window.TubeBenderNamedViews={...views,openPanel:undefined};
      window.TubeBenderCadWorkspace={...workspace,execute:()=>false};
      return {missingMethod:workspace.execute("views"),delegated:window.TubeBenderReferenceWorkspace.execute("display")};
    }finally{window.TubeBenderNamedViews=views;window.TubeBenderCadWorkspace=workspace;}
  });
  expect(result).toEqual({missingMethod:false,delegated:false});
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
